import createHttpError from "http-errors";
import axios from "axios";
import { RequestHandler } from "express";
import { isNullOrUndefined } from "util";

// import Config from "../models/config";
import KioskManager from "../models/kiosk_manager";
import KioskPhone, { KioskPhoneInterface } from "../models/kiosk_phone";
import Token, { TokenInterface } from "../models/token";
import asyncHandler from "../utils/async_handler";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_CONFLICT,
} from "../utils/constants";
import { apiResponse, CustomError } from "../utils/helper";
import { validateKioskPhone } from "./kiosk_phone";
import { findKioskManagerByPhone } from "./kiosk_manager";

export async function findTokenByPhone(
  kioskPhone: KioskPhoneInterface
): Promise<TokenInterface> {
  // Search for kioskPhone
  const kioskPhoneDoc = await KioskPhone.findOne({
    countryCode: kioskPhone.countryCode,
    number: kioskPhone.number,
  });

  if (isNullOrUndefined(kioskPhoneDoc)) return null;

  return Token.findOne({ kioskPhone: kioskPhoneDoc._id });
}

// Receive verification code which can be used to exchange for access token later (immediately done).
export function receiveVerificationCode(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // JavaScript object destructuring
    // The respond from auth server includes phone instead of kioskPhone
    const { phone, verificationCode } = req.body;

    // Return error if validation of phone fails
    const err = validateKioskPhone(phone);
    if (err) return next(err);

    if (!verificationCode)
      return next(
        createHttpError(HTTP_BAD_REQUEST, "verificationCode is required.")
      );

    // Find kiosk manager by phone
    const kioskManagerDoc = await findKioskManagerByPhone(phone);

    // Insert new kiosk manager if it doesn't exist.
    // There's no need to do anything if it does.
    if (!kioskManagerDoc) {
      // Only kioskPhone proeperty is mandatary,
      // the rest can be fill up by admin.
      const kioskPhoneDoc = new KioskPhone(req.body.phone);
      await kioskPhoneDoc.save();

      // Reference phone created earlier
      const kioskManager = { kioskPhone: kioskPhoneDoc._id };
      // Create a kiosk manager document
      const kioskManagerDoc = new KioskManager(kioskManager);
      // Save KioskManager with newly added KioskPhone's id
      await kioskManagerDoc.save();
    }

    // URL for exchanging the access token with a verification code
    const authVerifyURL = process.env.AUTH_VERIFY_URI;
    // Check that data is available
    if (!authVerifyURL || !authVerifyURL) {
      return next(
        createHttpError(HTTP_BAD_REQUEST, "Auth server URL not found.")
      );
    }

    // Request for access token immediately after
    // receiving verification code and save into DB.
    let accessTokenResponse;
    try {
      accessTokenResponse = await axios({
        method: "post",
        url: authVerifyURL,
        data: {
          phone: phone,
          verificationCode: verificationCode,
        },
        params: { developerId: process.env.AUTH_DEVELOPER_ID },
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.AUTH_API_TOKEN,
        },
      });

      if (!accessTokenResponse.data)
        return next(
          createHttpError(
            "Exchanging for access token failed. Error from auth server."
          )
        );

      const response = accessTokenResponse.data;
      // Get complete response data
      // const response = accessTokenResponse.data;
      if (!response.data || !response.data.jwt) {
        return next(
          createHttpError(
            "Exchanging for access token failed. No JWT returned."
          )
        );
      }

      const kioskPhoneDoc = await KioskPhone.findOne({
        countryCode: phone.countryCode,
        number: phone.number,
      });

      if (isNullOrUndefined(kioskPhoneDoc))
        return next(
          new CustomError(
            HTTP_INTERNAL_SERVER_ERROR,
            "Exchanging for access token failed. No kiosk phone found for token.",
            req.body
          )
        );

      // Save token.
      // This is required only resource server and resource routes.
      await Token.findOneAndUpdate(
        {
          kioskPhone: kioskPhoneDoc._id,
        },
        { kioskPhone: kioskPhoneDoc._id, token: response.data.jwt },
        { upsert: true }
      );

      // Send response to auth server about successfully receiving the access
      // token, no need to attach the token as this API is not part of CRUD APIs.
      return res.send(
        apiResponse(HTTP_OK, "Verification code exchanged for access token.", {
          accessToken: response.data.jwt,
        })
      );
    } catch (err) {
      // For handling token duplication as the async error handler will be
      //  caught here to fully display the message
      if (err.status == HTTP_CONFLICT) {
        return next(
          new CustomError(
            HTTP_INTERNAL_SERVER_ERROR,
            "Exchanging for access token failed.",
            err
          )
        );
      } else {
        const returnData = isNullOrUndefined(err.response?.data)
          ? err.message
          : err.response.data;

        return next(
          new CustomError(
            HTTP_INTERNAL_SERVER_ERROR,
            "Exchanging for access token failed.",
            returnData
          )
        );
      }
    }
  });
}
