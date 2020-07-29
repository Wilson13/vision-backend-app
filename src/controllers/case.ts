import { RequestHandler } from "express";

import Case from "../models/case";
import KioskManager from "../models/kiosk_manager";
import User, { UserInterface } from "../models/user";
import Phone, { PhoneInterface } from "../models/phone";
import asyncHandler from "../utils/async_handler";
import {
  apiResponse,
  CustomError,
  isFinalState,
  isCategory,
} from "../utils/helper";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_NOT_FOUND,
  CASE_STATUS_OPEN,
  GET_LIMIT,
  CASE_CATEGORY_MINISTER,
  CASE_STATUS_PROCESSING,
  CASE_STATUS_CLOSED,
  CASE_CATEGORY_WELFARE,
  CASE_STATUS_COMPLETED,
  CASE_CATEGORY_NORMAL,
} from "../utils/constants";
import AWS from "aws-sdk";
import { link } from "fs";

export async function findUserByPhone(
  userPhone: PhoneInterface
): Promise<UserInterface> {
  // Search for phone
  const phoneDoc = await Phone.findOne({
    countryCode: userPhone.countryCode,
    number: userPhone.number,
  });

  if (!phoneDoc) return null;

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
 * Retrieve a list of Cases.
 */
export function getCases(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const filter = {};
    const sort = {};
    // TODO: Multi location?
    // != null rules out null and undefined values
    if (req.query.location != null) {
      filter["location"] = req.query.location;
    }

    // Check if status is a valid value
    if (req.query.status != null) {
      if (
        !(
          req.query.status === CASE_STATUS_OPEN ||
          req.query.status === CASE_STATUS_PROCESSING ||
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
            null
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
      .limit(GET_LIMIT)
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
 * Assign a case to one of the volunteer, if the uuid provided exists.
 */
export function assignCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // Validate data
    if (!req.params.uid) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "POST /case/:uid/assign, uid is required",
          null
        )
      );
    } else if (!req.body.assignee) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "body.assignee is required (uuid of volunteer)",
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
      // Do not allow changing of assignee if it's not open
      return next(
        new CustomError(HTTP_BAD_REQUEST, "Case is not open.", {
          status: caseDoc.status,
        })
      );
    } else {
      // Case is in valid state, search for volunteer.
      const volunteerDoc = await KioskManager.findOne({
        uid: req.body.assignee,
      }).exec();

      if (!volunteerDoc) {
        return next(
          new CustomError(HTTP_NOT_FOUND, "volunteer does not exist.", null)
        );
      } else {
        // volunteer exists, insert UUID and update case status.
        caseDoc.assignee = volunteerDoc.uid;
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
          "POST /case/:uid/, uid is required",
          null
        )
      );
    } else {
      // Update
      if (updateStatus == null || !isFinalState(updateStatus)) {
        return next(
          new CustomError(
            HTTP_BAD_REQUEST,
            `closing status and can only be [` +
              `${CASE_STATUS_CLOSED}|` +
              `${CASE_STATUS_COMPLETED}` +
              `].`,
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

/**
 * Categorize a case, if it's not in one of the final states.
 */
export function categorizeCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // Validate data
    if (!req.params.uid) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "POST /case/:uid/categorize, uid is required",
          null
        )
      );
    } else if (!req.body.category) {
      return next(
        new CustomError(HTTP_BAD_REQUEST, "body.category is required", req.body)
      );
    } else if (!isCategory(req.body.category)) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          `category can only be [` +
            `${CASE_CATEGORY_NORMAL}|` +
            `${CASE_CATEGORY_WELFARE}|` +
            `${CASE_CATEGORY_MINISTER}` +
            `].`,
          null
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
    } else if (isFinalState(caseDoc.status)) {
      // Do not allow changing of status if it's not open or processing
      return next(
        new CustomError(HTTP_BAD_REQUEST, `Case is ${caseDoc.status}.`, {
          status: caseDoc.status,
        })
      );
    } else {
      // Case is in valid state, update category.
      caseDoc.category = req.body.category;
      await caseDoc.save();
      return res.send(
        apiResponse(
          HTTP_OK,
          `Case is categorized as ${req.body.category}.`,
          null
        )
      );
    }
  });
}

/**
 * Retrieve a list of attachments belonging to this particular case.
 */
export function getCasesAttachments(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (req.params?.uid == null) {
      return next(new Error("GET /cases/:uid, 'uid' is required"));
    } else {
      const links = [];
      const caseId = req.params.uid;
      const caseDoc = await Case.findOne({ uid: caseId }).exec();

      // Check if case exists
      if (!caseDoc) {
        return next(
          new CustomError(HTTP_NOT_FOUND, "Case not found.", {
            uid: caseId,
          })
        );
      }

      // Get files from s3 bucket
      try {
        AWS.config.update({
          accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
          region: process.env.APP_AWS_REGION,
        });
        // Create S3 service object
        const s3 = new AWS.S3({
          apiVersion: "2006-03-01",
          httpOptions: { timeout: 3000 },
        });

        // Bucket name
        const bucketName = process.env.AWS_BUCKET_NAME;

        for (let i = 0; i < 3; i++) {
          // Attachments' names are case uuid + [0-2] .
          const file = caseId + "_" + i;
          const params = {
            Bucket: bucketName,
            Key: file,
          };
          try {
            await s3.headObject(params).promise();
            // If no error is thrown for headObject, it means
            // file exists and link can be obtained safely.
            const link = await s3.getSignedUrlPromise("getObject", params);
            links.push(link);
            // files.push(file);
          } catch (err) {
            // File not found, ignored.
          }
        }
      } catch (err) {
        return next(
          new CustomError(
            HTTP_BAD_REQUEST,
            "Error occured while retreiving attachments.",
            null
          )
        );
      }

      res.send(apiResponse(HTTP_OK, "Attachments retrieved.", links));
    }
  });
}
