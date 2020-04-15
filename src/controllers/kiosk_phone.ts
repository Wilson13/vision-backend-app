import KioskPhone, { KioskPhoneInterface } from "../models/kiosk_phone";
import asyncHandler from "../utils/async_handler";
import { RequestHandler } from "express";
import { apiResponse, CustomError } from "../utils/helper";
import { HTTP_BAD_REQUEST, HTTP_OK } from "../utils/constants";

/**
 * This function was created to keep input validation outside of models,
 * which resulted in it being required in multiple places. Reason for not
 * relying on mongoose validation is not only because it should be handled
 * before data layer, but also to return 400 BAD REQEUST for invalid input,
 * rather than 500 INTERNAL SERVER ERROR that will be returned upon main app.ts
 * error capturing mechanism. In summary, it's an active error handling.
 *
 * @param kioskPhone KioskPhoneInterface
 * @returns CustomError
 */
export function validateKioskPhone(
  kioskPhone: KioskPhoneInterface
): CustomError {
  if (!kioskPhone)
    return new CustomError(HTTP_BAD_REQUEST, "kioskPhone is required", null);
  else if (!kioskPhone.countryCode)
    return new CustomError(
      HTTP_BAD_REQUEST,
      "kioskPhone.countryCode is required",
      null
    );
  else if (!kioskPhone.number)
    return new CustomError(
      HTTP_BAD_REQUEST,
      "kioskPhone.number is required",
      null
    );
  else return null;
}

// Display list of all KioskPhone.
export function getKioskPhone(): RequestHandler {
  return asyncHandler(async (req, res) => {
    const kioskPhone = await KioskPhone.find({}, { _id: 0, __v: 0 })
      .lean()
      .populate("kioskPhone")
      .exec();
    res.send(apiResponse(HTTP_OK, "KioskPhone retrieved.", kioskPhone));
  });
}

export function createKioskPhones(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const kioskPhone = new KioskPhone(req.body.kioskPhone);

    // Return error if validation fails
    const err = validateKioskPhone(kioskPhone);
    if (err) return next(err);

    await kioskPhone.save();
    res.send(apiResponse(HTTP_OK, "KioskPhone created.", kioskPhone));
  });
}

export function deleteKioskPhones(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (!req.body.kioskPhone)
      return next(
        new CustomError(HTTP_BAD_REQUEST, "kioskPhone is required", null)
      );
    if (!req.body.kioskPhone.countryCode)
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "kioskPhone.countryCode is required",
          null
        )
      );
    if (!req.body.kioskPhone.number)
      return next(
        new CustomError(HTTP_BAD_REQUEST, "kioskPhone.number is required", null)
      );

    const { countryCode, number } = req.body.kioskPhone;

    const kioskPhone = req.body.kioskPhone;

    const result = await KioskPhone.deleteOne({
      countryCode: countryCode,
      number: number,
    });

    const kioskPhoneStr = JSON.stringify(kioskPhone).replace(/[\\|\"]/g, "'");
    if (result.deletedCount > 0)
      res.send(
        apiResponse(
          HTTP_OK,
          `KioskPhone ${kioskPhoneStr} delete successfully`,
          kioskPhone
        )
      );
    else {
      res
        .status(HTTP_BAD_REQUEST)
        .json(
          apiResponse(
            HTTP_BAD_REQUEST,
            `Something went wrong, KioskPhone ${kioskPhoneStr} not deleted.`,
            kioskPhone
          )
        );
    }
  });
}
