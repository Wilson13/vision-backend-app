import { RequestHandler } from "express";
import AWS from "aws-sdk";
import sendGrid from "@sendgrid/mail";
import twilio from "twilio";
import isEmpty from "validator/lib/isEmpty";
import isEmail from "validator/lib/isEmail";

import asyncHandler from "../utils/async_handler";
import { CustomError } from "../utils/helper";
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_REQUEST,
  ACCOUNT_EMART,
  ACCOUNT_ATS,
} from "../utils/constants";
import { body, ValidationChain } from "express-validator";

/**
 * Sanitizer middleware for notifications API
 */
export function sanitize(): ValidationChain[] {
  return [
    body("type").trim().stripLow(true),
    body("accountName").trim().stripLow(true),
    body("from").trim().stripLow(true),
    body("subject").trim().stripLow(true),
    body("message").trim().stripLow(true),
  ];
}

/**
 * Validator middleware for notifications API
 * Note:
 * It is safe to use validator for fields sanitized because sanitize() function has
 * ensured the body fields are string (or empty string e.g. '') instead of undefined.
 *
 * If not, isEmpty will not work for fields that are undefined.
 */
export function validate(): RequestHandler {
  return (req, res, next) => {
    let errorMsg = "";
    const bodies = req.body;

    // Validate parameters and fields
    if (isEmpty(bodies.type)) {
      errorMsg = "Body field 'type' is required.";
    } else if (bodies.type != "sms" && bodies.type != "email") {
      errorMsg = "Body field 'type' can only be ['sms'|'email'].";
    } else if (bodies.type == "sms") {
      // Validation for SMS notification
      if (
        isEmpty(bodies.accountName) ||
        isEmpty(bodies.from) ||
        isEmpty(bodies.to) ||
        isEmpty(bodies.message)
      ) {
        errorMsg =
          "'type', 'accountName', 'from', 'to', 'message' are required.";
      }
    } else if (
      bodies.accountName != ACCOUNT_EMART &&
      bodies.accountName != ACCOUNT_ATS
    ) {
      errorMsg = "Route parameter 'accountName' can only be ['emart'|'ats']..";
    } else if (bodies.type == "email") {
      // Validation for Email notification
      if (
        isEmpty(bodies.accountName) ||
        isEmpty(bodies.from) ||
        isEmpty(bodies.subject) ||
        isEmpty(bodies.message)
      ) {
        errorMsg =
          "'type', 'accountName', 'from', 'to', 'subject', 'message' are required.";
      } else if (!Array.isArray(bodies.to)) {
        errorMsg = "'to' is required and has to be an array";
      } else if (
        !bodies.to.some((_unusedParam, index, arr) => {
          arr[index] = arr[index].trim();
          return isEmail(arr[index]);
        })
      ) {
        // Check "to" recipient are all valid emails
        errorMsg = "'to' has to be valid email addresses.";
      } else if (!isEmail(bodies.from)) {
        // Check "from" is a valid email address
        errorMsg = "'from' has to be a valid email address.";
      }

      // Validations below are segregated because they contain positive-check logic
      // (optional fields) that will be true if the values are valid and will break else-if chain.

      // Notes:
      // 1. Can't use isEmpty here because cc and bcc fields are not sanitized and could be undefined.
      // 2. Can't check only isArray because they are optional, if they are undefined, errorMsg
      // will always be non-empty, rendering it into a "required" field.
      // 3. Checking 'truthy' is enough here so the value can't be null, undefined, NaN, empty string (""), 0, or false.
      if (bodies.cc && !Array.isArray(bodies.cc)) {
        // If bodies.cc is defined then check "cc" recipient are all valid emails.
        // If it is undefined, no need to check if it's an array or not.
        errorMsg = "'cc' has to be an array";
      } else if (bodies.cc && Array.isArray(bodies.cc)) {
        // If bodies.cc is defined and it is indeed an array.
        // Check if all elements are valid email addresses.
        if (
          !bodies.cc.some((_unusedParam, index, arr) => {
            arr[index] = arr[index].trim();
            return isEmail(arr[index]);
          })
        ) {
          errorMsg = "'cc' has to be valid email addresses.";
        }
      }

      if (bodies.bcc && !Array.isArray(bodies.bcc)) {
        errorMsg = "'bcc' has to be an array";
      } else if (bodies.bcc && Array.isArray(bodies.bcc)) {
        if (
          !bodies.bcc.some((_unusedParam, index, arr) => {
            arr[index] = arr[index].trim();
            return isEmail(arr[index]);
          })
        ) {
          errorMsg = "'bcc' has to be valid email addresses.";
        }
      }
    }

    if (!isEmpty(errorMsg)) {
      // Pass error to next eror-handling middleware
      return next(new CustomError(HTTP_BAD_REQUEST, errorMsg, null));
    } else {
      // Pass control to next middleware
      return next();
    }
  };
}

/**
 * Send different types of notification using 3rd party service,
 * deducting credits from a specified project/company's account.
 */
export function sendNotification(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // Setup constants
    let twilioClient;
    const balanceTable = process.env.AWS_DYNAMO_DB_TABLE_BALANCE;
    const type = req.body.type;
    // cc and bcc requires default values since they are optional and could be undefined.
    const {
      accountName,
      from,
      to,
      message,
      subject,
      cc = "",
      bcc = "",
    } = req.body;
    let sendGridApiKey, deductCredit;

    if (type == "sms") {
      if (accountName == ACCOUNT_ATS) {
        twilioClient = twilio(
          process.env.TWILIO_ATS_ACCOUNT_SID,
          process.env.TWILIO_ATS_AUTH_TOKEN
        );
      } else if (accountName == ACCOUNT_EMART) {
        twilioClient = twilio(
          process.env.TWILIO_EMART_ACCOUNT_SID,
          process.env.TWILIO_EMART_AUTH_TOKEN
        );
      }
    } else if (type == "email") {
      if (accountName == ACCOUNT_ATS) {
        sendGridApiKey = process.env.SEND_GRID_ATS_API_KEY_SECRET;
      } else if (accountName == ACCOUNT_EMART) {
        sendGridApiKey = process.env.SEND_GRID_EMART_API_KEY_SECRET;
      }
    }

    try {
      // Setup AWS config before using AWS services
      AWS.config.update({
        region: process.env.APP_AWS_REGION,
      });
      // Create DynamoDB client
      const docClient = new AWS.DynamoDB.DocumentClient();
      // Setup update params
      const updateParams = {
        TableName: balanceTable,
        Key: { account_name: accountName },
        UpdateExpression: "",
        ExpressionAttributeValues: {},
      };

      // Send notification based on type
      switch (type) {
        case "sms":
          // Send notification via SMS
          deductCredit = 0;
          if (process.env.SMS_ENABLED) {
            const twilioRes = await twilioClient.messages.create({
              body: message,
              to: to,
              from: from,
            });
            deductCredit = Number(twilioRes.numSegments); // numSegments is a string
          }
          // Deduct balance from account
          updateParams.UpdateExpression =
            "set sms_balance = sms_balance - :dec";
          updateParams.ExpressionAttributeValues = {
            ":dec": deductCredit,
          };
          await docClient.update(updateParams).promise();
          break;
        case "email":
          // Send notification via email
          deductCredit = 1;
          const emailContent = {
            to: to,
            cc: cc,
            bcc: bcc,
            from: from, // Use the email address or domain you verified above
            subject: subject,
            text: message,
          };
          // Send emails when error occured.
          sendGrid.setApiKey(sendGridApiKey);
          await sendGrid.send(emailContent);
          // Deduct balance from account
          updateParams.UpdateExpression =
            "set email_balance = email_balance - :dec";
          updateParams.ExpressionAttributeValues = {
            ":dec": deductCredit,
          };
          await docClient.update(updateParams).promise();
          break;
        default:
          return next(
            new CustomError(
              HTTP_BAD_REQUEST,
              "No notification type found.",
              null
            )
          );
      }

      res.status(HTTP_OK).end();
    } catch (err) {
      return next(
        new CustomError(
          HTTP_INTERNAL_SERVER_ERROR,
          "Error occured while sending notification.",
          err
        )
      );
    }
  });
}
