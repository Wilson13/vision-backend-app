import Phone, { PhoneInterface } from "../models/phone";
import asyncHandler from "../utils/async_handler";
import { RequestHandler } from "express";
import { apiResponse, CustomError } from "../utils/helper";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  ERROR_MSG_PHONE_COUNTRY,
  ERROR_MSG_PHONE_NUMBER,
} from "../utils/constants";
import { isNullOrUndefined } from "util";

const countryCodeRegex = /^\d{2}$/;
const phoneNumberRegex = /^\d{8}$/;
export function validatePhoneFormat(phone): string {
  if (!isNullOrUndefined(phone)) {
    if (!countryCodeRegex.test(phone.countryCode))
      return ERROR_MSG_PHONE_COUNTRY;
    else if (!phoneNumberRegex.test(phone.number))
      return ERROR_MSG_PHONE_NUMBER;
  }
}

/**
 * This function was created to keep input validation outside of models,
 * which resulted in it being required in multiple places. Reason for not
 * relying on mongoose validation is not only because it should be handled
 * before data layer, but also to return 400 BAD REQEUST for invalid input,
 * rather than 500 INTERNAL SERVER ERROR that will be returned upon main app.ts
 * error capturing mechanism. In summary, it's an active error handling.
 *
 * @param phone PhoneInterface
 * @returns CustomError
 */
export function validatePhone(phone: PhoneInterface): CustomError {
  if (!phone)
    return new CustomError(HTTP_BAD_REQUEST, "Phone is required", null);

  const phoneValStr = validatePhoneFormat(phone);
  if (!isNullOrUndefined(phoneValStr))
    return new CustomError(HTTP_BAD_REQUEST, phoneValStr, null);
  else return null;
}

// Display list of all Phones.
export function getPhones(): RequestHandler {
  return asyncHandler(async (req, res) => {
    const phone = await Phone.find({}, { _id: 0, __v: 0 })
      .lean()
      .populate("phone")
      .exec();
    res.send(apiResponse(HTTP_OK, "Phones retrieved.", phone));
  });
}

export function createPhones(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const phone = new Phone(req.body.phone);

    // Return error if validation fails
    const err = validatePhone(phone);
    if (err) return next(err);

    await phone.save();
    res.send(apiResponse(HTTP_OK, "Phone created.", phone));
  });
}

export function deletePhones(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (!req.body.phone)
      return next(new CustomError(HTTP_BAD_REQUEST, "Phone is required", null));
    if (!req.body.phone.countryCode)
      return next(
        new CustomError(HTTP_BAD_REQUEST, "Phone.countryCode is required", null)
      );
    if (!req.body.phone.number)
      return next(
        new CustomError(HTTP_BAD_REQUEST, "Phone.number is required", null)
      );

    const { countryCode, number } = req.body.phone;

    const phone = req.body.phone;

    const result = await Phone.deleteOne({
      countryCode: countryCode,
      number: number,
    });

    if (result.deletedCount > 0)
      res.send(
        apiResponse(HTTP_OK, `Phone "${phone}" delete successfully`, phone)
      );
    else {
      res
        .status(HTTP_BAD_REQUEST)
        .json(
          apiResponse(
            HTTP_BAD_REQUEST,
            `Something went wrong, phone "${phone}" not deleted.`,
            phone
          )
        );
    }
  });
}
