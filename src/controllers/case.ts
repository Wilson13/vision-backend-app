import { RequestHandler } from "express";
import { Error } from "mongoose";
import validator from "validator";
import { isNullOrUndefined } from "util";

import Case from "../models/case";
import User, { UserInterface } from "../models/user";
import Phone, { PhoneInterface } from "../models/phone";
import asyncHandler from "../utils/async_handler";
import { apiResponse, CustomError } from "../utils/helper";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_NOT_FOUND,
  CASE_STATUS_OPEN,
  GET_LIMIT as GET_LIST_LIMIT,
} from "../utils/constants";

export async function findUserByPhone(
  userPhone: PhoneInterface
): Promise<UserInterface> {
  // Search for phone
  const phoneDoc = await Phone.findOne({
    countryCode: userPhone.countryCode,
    number: userPhone.number,
  });

  if (isNullOrUndefined(phoneDoc)) return null;

  return User.findOne({ phone: phoneDoc._id });
}

export function validateNRIC(nric: string): CustomError {
  const nricRegex = /^(S|T|F|G)\d{7}.$/;

  if (!nric)
    return new CustomError(HTTP_BAD_REQUEST, "nric is required", {
      nric: nric,
    });
  else if (!nricRegex.test(nric))
    return new CustomError(HTTP_BAD_REQUEST, "nric format is wrong", {
      nric: nric,
    });
  else return null;
}

/**
 * This function was created to keep input validation outside of models,
 * which resulted in it being required in multiple places. Reason for not
 * relying on mongoose validation is not only because it should be handled
 * before data layer, but also to return 400 BAD REQEUST for invalid input,
 * rather than 500 INTERNAL SERVER ERROR that will be returned upon main app.ts
 * error capturing mechanism. In summary, it's an active error handling.
 *
 * @param user UserInterface
 * @returns CustomError
 */
export function validateUser(user: UserInterface): CustomError {
  if (!user) return new CustomError(HTTP_BAD_REQUEST, "User is required", null);
  else if (
    !user.nric ||
    !user.email ||
    !user.name ||
    !user.phone ||
    !user.race ||
    !user.gender ||
    !user.maritalStatus ||
    !user.occupation ||
    !user.postalCode ||
    !user.blockHseNo ||
    !user.address ||
    !user.flatType
  ) {
    return new CustomError(
      HTTP_BAD_REQUEST,
      "nric, email, name, phone, race, gender, maritalStatus, occupation, postalCode, blockHseNo, address, flatType are required",
      user
    );
  } else if (!validator.isNumeric(user.postalCode.toString())) {
    return new CustomError(
      HTTP_BAD_REQUEST,
      "postalCode needs to be a number",
      user
    );
  } else if (
    user.noOfChildren &&
    !validator.isNumeric(user.noOfChildren.toString())
  ) {
    return new CustomError(
      HTTP_BAD_REQUEST,
      "noOfChildren needs to be a number",
      user
    );
  } else if (validateNRIC(user.nric)) {
    return validateNRIC(user.nric);
  } else if (!validator.isEmail(user.email))
    return new CustomError(HTTP_BAD_REQUEST, "invalid email ", user);
  else return null;
}

// Display list of Case.
export function getCases(): RequestHandler {
  return asyncHandler(async (req, res) => {
    const filter = {};
    const sort = {};
    if (req.query.location) {
      filter["location"] = req.query.location;
    } else if (req.query.sort) {
      // If sort by query given as 1, sort by ascending.
      // Else, sort by descending (even when no query is given).
      sort["createdAt"] = req.query.sort == 1 ? 1 : -1;
    }
    const caseDocs = await Case.find(filter, { _id: 0, __v: 0 })
      .limit(GET_LIST_LIMIT)
      .sort(sort)
      .exec();
    res.send(apiResponse(HTTP_OK, "Cases retrieved.", caseDocs));
  });
}

// This function error handler is handled by asyncHandler that calls it
export function deleteCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    let result, msg, status, data;

    if (req.params?.uid) {
      result = await Case.findOneAndDelete({ uid: req.params.uid }).exec();

      if (result) {
        status = HTTP_OK;
        msg = `Case '${result.uid}' delete successfully`;
        data = result;
      } else {
        status = HTTP_BAD_REQUEST;
        msg = `Something went wrong, case not deleted.`;
        data = { uid: req.params.uid };
      }

      // Since this statement is used for both success and failure of deletion,
      // status needs to be explicitly stated for the case of failure.
      res.status(status).send(apiResponse(status, msg, data));
    } else {
      return next(new Error("DELETE /case/:uid/ is required"));
    }
  });
}

// Search for a user, POST method is used for form submit etc.
export function searchUser(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const nric = req.body.nric;

    // Return error if validation fails
    const err = validateNRIC(nric);
    if (err) return next(err);

    // Search for user with NRIC
    const userDoc = await User.findOne({ nric: nric }, { _id: 0, __v: 0 });
    if (!userDoc)
      return next(new CustomError(HTTP_NOT_FOUND, "User not found.", req.body));
    else {
      return res.send(apiResponse(HTTP_OK, "User found.", userDoc));
    }
  });
}

// Create a new case that reference the user
export function createCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!req.body.subject || !req.body.location || !req.body.date) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "location, subject, date is required.",
          req.body
        )
      );
    } else if (req.body.subject.length > 280) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "Maximum characters allowed for subject is 280.",
          req.body
        )
      );
    } else if (!dateRegex.test(req.body.date)) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "Please send date in ISO 8601 format (yyyy-MM-dd).",
          req.body
        )
      );
    }
    if (req.params?.uid) {
      const userDoc = await User.findOne({ uid: req.params.uid }).exec();

      if (!userDoc) {
        return next(
          new CustomError(HTTP_NOT_FOUND, "User not found.", {
            uid: req.params.uid,
          })
        );
      }

      // Pprepare data
      const { subject, location } = req.body;
      const date = Date.parse(req.body.date);

      // Datetime range for today
      const start = new Date(date);
      const end = new Date(date);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Search for existing open case created today, at this location, by this user.
      const existingCase = await Case.findOne({
        location: location,
        createdAt: { $gte: start, $lt: end },
        nric: userDoc.nric,
        status: CASE_STATUS_OPEN,
      }).sort({
        createdAt: -1,
      });

      if (existingCase) {
        return next(
          new CustomError(
            HTTP_NOT_FOUND,
            "Existing case found for user.",
            existingCase
          )
        );
      }

      // Search for cases created on today, at this location.
      const caseDoc = await Case.findOne({
        location: location,
        createdAt: { $gte: start, $lt: end },
      }).sort({
        createdAt: -1,
      });

      let newQueueNo = null;
      if (caseDoc) {
        // Incrementing queue no
        newQueueNo = caseDoc.queueNo + 1;
      } else {
        // First case of the day at this location
        newQueueNo = 1;
      }

      const newCase = new Case({
        uid: userDoc.uid,
        nric: userDoc.nric,
        subject: subject,
        status: CASE_STATUS_OPEN,
        refId: `${userDoc.postalCode}_${userDoc.blockHseNo}_${userDoc.floorNo}_${userDoc.unitNo}`,
        location: location,
        queueNo: newQueueNo,
      });

      const savedCase = await newCase.save();
      return res.send(apiResponse(HTTP_OK, "New case created.", savedCase));
    } else {
      return next(new Error("POST /user/:uid/case, 'uid' is required"));
    }
  });
}
