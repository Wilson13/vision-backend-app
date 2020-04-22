import createHttpError from "http-errors";
import { RequestHandler } from "express";
import { Error } from "mongoose";
import validator from "validator";
import { isNullOrUndefined } from "util";
import Axios from "axios";

import KioskManager, { KioskManagerInterface } from "../models/kiosk_manager";
import KioskPhone, { KioskPhoneInterface } from "../models/kiosk_phone";
import asyncHandler from "../utils/async_handler";
import { apiResponse, CustomError } from "../utils/helper";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
} from "../utils/constants";
import { validateKioskPhone } from "./kiosk_phone";

export function validateKioskManager(
  kioskManager: KioskManagerInterface
): CustomError {
  if (!kioskManager)
    return new CustomError(HTTP_BAD_REQUEST, "KioskManager is required", null);
  else if (
    !kioskManager.email ||
    !kioskManager.firstName ||
    !kioskManager.lastName ||
    !kioskManager.kioskPhone
  )
    return new CustomError(
      HTTP_BAD_REQUEST,
      "email, firstName, lastName, kioskPhone is required",
      kioskManager
    );
  else if (!validator.isEmail(kioskManager.email))
    return new CustomError(HTTP_BAD_REQUEST, "invalid email ", kioskManager);
  else if (validator.isEmpty(kioskManager.firstName))
    return new CustomError(
      HTTP_BAD_REQUEST,
      "firstName is required",
      kioskManager
    );
  else if (validator.isEmpty(kioskManager.lastName))
    return new CustomError(
      HTTP_BAD_REQUEST,
      "lastName is required",
      kioskManager
    );
  else return null;
}

// This function error handler is handled by asyncHandler that calls it
export async function findKioskManagerByPhone(
  kioskPhone: KioskPhoneInterface
): Promise<KioskManagerInterface> {
  // Search for kioskPhone
  const kioskPhoneDoc = await KioskPhone.findOne({
    countryCode: kioskPhone.countryCode,
    number: kioskPhone.number,
  });

  if (isNullOrUndefined(kioskPhoneDoc)) return null;

  return KioskManager.findOne({ kioskPhone: kioskPhoneDoc._id });
}

// Display list of all Users.
export function getKioskManagers(): RequestHandler {
  return asyncHandler(async (req, res) => {
    const userDocs = await KioskManager.find({}, { _id: 0, __v: 0 })
      .populate("kioskPhone")
      .exec();
    res.send(apiResponse(HTTP_OK, "Users retrieved.", userDocs));
  });
}

// If authorization is a success, save kiosk manager into DB
// because it means this kiosk manager exists in Auth Server.
// Retrieve and display access token too since webhook/login
// has been called by Auth Server.
export function authorizeKioskManager(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // const kioskPhone = req.body.kioskPhone;
    const { kioskPhone, loginType, password, otp } = req.body;

    const err = validateKioskPhone(kioskPhone);
    if (err) return next(err);

    // Validate loginType
    if (!loginType)
      return next(
        createHttpError(
          HTTP_BAD_REQUEST,
          "loginType ['password'|'otp'] is required."
        )
      );
    // Check correct login type given
    else if (!(loginType === "password" || loginType === "otp"))
      return next(
        createHttpError(HTTP_BAD_REQUEST, "loginType is wrong [password, otp].")
      );
    // Validate password and OTP
    else if (loginType === "password" && !password)
      return next(createHttpError(HTTP_BAD_REQUEST, "password is required."));
    else if (loginType === "otp" && !otp)
      return next(createHttpError(HTTP_BAD_REQUEST, "otp is required."));

    // Prepare data for calling OAUTH authorize API
    const authorizeBody = req.body;
    // The call to /oauth/authorize contains not kioskPhone but phone
    delete authorizeBody.kioskPhone;
    authorizeBody.phone = kioskPhone;

    const redirectUri = process.env.AUTH_REDIRECT_URI;
    const authorizeUri = process.env.AUTH_AUTHORIZE_URI;

    authorizeBody.redirectUri = redirectUri;

    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.AUTH_API_TOKEN,
      },
      params: {
        developerId: process.env.AUTH_DEVELOPER_ID,
      },
    };

    // Attempt to authorize kiosk manager
    try {
      const authorizeResponse = await Axios.post(
        authorizeUri,
        authorizeBody,
        config
      );

      // Get complete response data
      const response = authorizeResponse.data;

      if (response.status !== HTTP_OK)
        return next(
          new CustomError(
            HTTP_INTERNAL_SERVER_ERROR,
            "Authorization failed.",
            response
          )
        );

      const kioskManager: KioskManagerInterface = await findKioskManagerByPhone(
        kioskPhone
      );
      // Return error if kiosk manager was not found
      if (!kioskManager?.accessToken)
        return next(
          new CustomError(
            HTTP_BAD_REQUEST,
            "Authorization failed. Access token not found after verification code has been sent to redirect URL.",
            req.body
          )
        );

      // Send response to auth server about successfully receiving the access
      // token, no need to attach the token as this API is not part of CRUD APIs.
      return res.send(
        apiResponse(HTTP_OK, "Verification code sent to redirect URL", {
          redirectUri: redirectUri,
          accessToken: kioskManager.accessToken,
        })
      );
    } catch (err) {
      const returnData = isNullOrUndefined(err.response?.data)
        ? err.message
        : err.response.data;
      return next(
        new CustomError(
          HTTP_INTERNAL_SERVER_ERROR,
          "Authorization failed.",
          returnData
        )
      );
    }
  });
}

export function deleteKioskManager(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    let result, email, kioskPhone, phoneStr;
    if (req.body.email) {
      email = req.body.email;
      // Delete kiosk manager with email
      // Phone associated is deleted in post findOneAndDelete hook
      result = await KioskManager.findOneAndDelete({ email: email });
    } else if (req.body.kioskPhone) {
      kioskPhone = req.body.kioskPhone;
      phoneStr = JSON.stringify(kioskPhone).replace(/[\\|\"]/g, "'");

      // Return error if validation of kioskPhone fails
      const err = validateKioskPhone(kioskPhone);
      if (err) return next(err);
      // Search for kiosk manager
      const kioskManager: KioskManagerInterface = await findKioskManagerByPhone(
        kioskPhone
      );
      // Return error if kiosk manager was not found
      if (!kioskManager)
        return next(
          new CustomError(HTTP_BAD_REQUEST, "KioskManager not found", req.body)
        );
      // Delete kiosk manager with kioskPhone
      // Phone associated is deleted in post findOneAndDelete hook
      result = await KioskManager.findOneAndDelete({
        kioskPhone: kioskManager.kioskPhone,
      });
    } else {
      return next(new Error("Email or kioskPhone is required"));
    }

    if (result) {
      const message = email
        ? `KioskManager '${email}' delete successfully`
        : `KioskManager '${phoneStr}' delete successfully`;
      const data = email ? email : kioskPhone;
      res.send(apiResponse(HTTP_OK, message, data));
    } else {
      const message = email
        ? `Something went wrong, kiosk manager '${email}' not deleted.`
        : `Something went wrong, kiosk manager '${phoneStr}' not deleted.`;
      const data = email ? email : kioskPhone;

      res
        .status(HTTP_BAD_REQUEST)
        .json(apiResponse(HTTP_BAD_REQUEST, message, data));
    }
  });
}

export function sendOTP(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // JavaScript object destructuring
    const kioskPhone = req.body.kioskPhone;

    // Return error if validation of phone fails
    const err = validateKioskPhone(kioskPhone);
    if (err) return next(err);

    const otpURI = process.env.AUTH_OTP_URI;
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.AUTH_API_TOKEN,
      },
      params: {
        developerId: process.env.AUTH_DEVELOPER_ID,
      },
    };

    try {
      // Send OTP request to auth server
      const sendOtpResponse = await Axios.post(
        otpURI,
        { phone: kioskPhone },
        config
      );

      // Get complete response data
      const response = sendOtpResponse?.data;
      if (response.status !== HTTP_OK)
        return next(
          new CustomError(
            HTTP_INTERNAL_SERVER_ERROR,
            "Get OTP from auth server failed.",
            response
          )
        );
      // OTP successfully requested
      return res.send(apiResponse(HTTP_OK, "OTP sent.", response));
    } catch (err) {
      const returnData = isNullOrUndefined(err.response?.data)
        ? err.message
        : err.response.data;
      return next(
        new CustomError(
          HTTP_INTERNAL_SERVER_ERROR,
          "Get OTP failed.",
          returnData
        )
      );
    }
  });
}
