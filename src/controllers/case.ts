import { RequestHandler } from "express";
import validator from "validator";
import { isNullOrUndefined } from "util";

import Case from "../models/case";
import KioskManager from "../models/kiosk_manager";
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
  CASE_CATEGORY_MINISTER,
  CASE_STATUS_PROCESSING,
  CASE_STATUS_CLOSED,
  CASE_CATEGORY_WELFARE,
  CASE_STATUS_COMPLETED,
  CASE_CATEGORY_NORMAL,
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

/**
 * Check if the status provided is one of the final states,
 * return false if it isn't.
 * @param status
 */
function isFinalState(status: string): boolean {
  return (
    status === CASE_STATUS_CLOSED ||
    status === CASE_STATUS_PROCESSING ||
    status === CASE_STATUS_COMPLETED
  );
}

/**
 * Check if the category provided is one of the valid category values,
 * return false if it isn't.
 * @param category
 */
function isCategory(category: string): boolean {
  return (
    category === CASE_CATEGORY_NORMAL ||
    category === CASE_CATEGORY_WELFARE ||
    category === CASE_CATEGORY_MINISTER
  );
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

/**
 * Display list of Case.
 */
export function getCases(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // TODO: Should not only get open cases?
    // const filter = { status: CASE_STATUS_OPEN };
    const filter = {};
    const sort = {};
    // TODO: Multi location?
    // != null rules out null and undefined values
    console.log(req.query);
    if (req.query.location != null) {
      filter["location"] = req.query.location;
    }

    // Check if status is a valid value
    if (req.query.status != null) {
      if (
        !(
          req.query.status === CASE_STATUS_OPEN ||
          isFinalState(req.query.status)
        )
      ) {
        return next(
          new CustomError(
            HTTP_BAD_REQUEST,
            `status can only be [` +
              `${CASE_STATUS_OPEN}|` +
              `${CASE_STATUS_CLOSED}|` +
              `${CASE_STATUS_PROCESSING}|` +
              `${CASE_STATUS_COMPLETED}` +
              `].`,
            null
          )
        );
      } else {
        filter["status"] = req.query.status;
      }
    }

    // Check if category is a valid value
    if (req.query.category) {
      if (!isCategory(req.query.category)) {
        return next(
          new CustomError(
            HTTP_BAD_REQUEST,
            `category can only be [` +
              `${CASE_CATEGORY_NORMAL}|` +
              `${CASE_CATEGORY_WELFARE}|` +
              `${CASE_CATEGORY_MINISTER}` +
              `].`,
            req.body
          )
        );
      } else {
        filter["category"] = req.query.category;
      }
    }

    if (req.query.sort) {
      // If sort by query given as 1, sort by ascending.
      // Else, sort by descending (even when no query is given).
      sort["createdAt"] = req.query.sort == 1 ? 1 : -1;
    }
    const caseDocs = await Case.find(filter, { _id: 0, __v: 0 })
      .limit(GET_LIST_LIMIT)
      .sort(sort)
      .lean()
      .exec();

    res.send(apiResponse(HTTP_OK, "Cases retrieved.", caseDocs));
  });
}

export function deleteCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    let result, msg, status, data;

    if (!req.params.uid) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "DELETE /case/:uid/, uid is required",
          null
        )
      );
    } else {
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
    }
  });
}

/**
 * Assign a case to one of the kiosk manager, if the uuid provided exists.
 */
export function assignCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // Validate data
    if (!req.params.uid) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "PATCH /case/:uid/, uid is required",
          null
        )
      );
    } else if (!req.body.assignee) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "body.assignee is required (uuid of kiosk manager)",
          req.body
        )
      );
    }

    // Search for case
    const caseDoc = await Case.findOne({
      uid: req.params.uid,
    }).exec();

    if (!caseDoc) {
      return next(
        new CustomError(HTTP_NOT_FOUND, "Case not found", {
          uid: req.params.uid,
        })
      );
    } else if (caseDoc.status !== CASE_STATUS_OPEN) {
      // Do not allow changing of status if it's not open
      return next(
        new CustomError(HTTP_BAD_REQUEST, "Case is not open.", {
          status: caseDoc.status,
        })
      );
    } else {
      // Case is in valid state, search for kiosk manager.
      const kioskManagerDoc = await KioskManager.findOne({
        uid: req.body.assignee,
      }).exec();

      if (!kioskManagerDoc) {
        return next(
          new CustomError(HTTP_NOT_FOUND, "Kiosk manager does not exist.", null)
        );
      } else {
        // Kiosk manager exists, insert UUID and update case status.
        caseDoc.assignee = kioskManagerDoc.uid;
        caseDoc.status = CASE_STATUS_PROCESSING;
        await caseDoc.save();
        return res.send(apiResponse(HTTP_OK, "Case is assigned.", null));
      }
    }
  });
}

/**
 * Close a case with a status update, if it's not in one of the final states.
 */
export function closeCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const updateStatus = req.body.status;

    if (!req.params.uid) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "PATCH /case/:uid/, uid is required",
          null
        )
      );
    } else {
      // Update
      if (!updateStatus || isFinalState(req.query.status)) {
        return next(
          new CustomError(
            HTTP_BAD_REQUEST,
            `closing status and can only be [
              ${CASE_STATUS_CLOSED}|
              ${CASE_STATUS_PROCESSING}|
              ${CASE_CATEGORY_MINISTER}|
              ${CASE_CATEGORY_WELFARE}
            ].`,
            req.body
          )
        );
      }

      const caseDoc = await Case.findOne({
        uid: req.params.uid,
      }).exec();

      if (caseDoc) {
        // Do not allow changing of status if it's in one of the final state.
        if (isFinalState(caseDoc.status)) {
          return next(
            new CustomError(HTTP_BAD_REQUEST, "Case is closed.", caseDoc)
          );
        } else {
          caseDoc.status = updateStatus;
          const updateRes = await caseDoc.save();
          return res.send(
            apiResponse(HTTP_OK, "Case is updated and closed.", updateRes)
          );
        }
      } else {
        return next(
          new CustomError(HTTP_NOT_FOUND, "Case not found", {
            uid: req.params.uid,
          })
        );
      }
    }
  });
}
