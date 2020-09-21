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
    body("type").trim().escape(),
    body("accountName").trim().escape(),
    body("from").trim().escape(),
    body("to").trim().escape(),
    body("subject").trim().escape(),
    body("message").trim().escape(),
  ];
}

/**
 * Validator middleware for notifications API
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
        isEmpty(bodies.to) ||
        isEmpty(bodies.subject) ||
        isEmpty(bodies.message)
      ) {
        errorMsg =
          "'type', 'accountName', 'from', 'to', 'subject', 'message' are required.";
      } else if (!isEmail(bodies.to) || !isEmail(bodies.from)) {
        // Check "to" and "from" are valid emails
        errorMsg = "'from', 'to' have to be valid email addresses.";
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
    const { accountName, from, to, message } = req.body;
    let subject, sendGridApiKey, deductCredit;

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
      subject = req.body.subject;
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
