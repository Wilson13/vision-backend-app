import { RequestHandler } from "express";
import AWS from "aws-sdk";
import sendGrid from "@sendgrid/mail";
import twilio from "twilio";
import { isEmpty } from "validate.js";

import asyncHandler from "../utils/async_handler";
import { CustomError } from "../utils/helper";
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_REQUEST,
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
    body("message").trim().escape(),
  ];
}

/**
 * Validator middleware for notifications API
 */
export function validate(): RequestHandler {
  return (req, res, next) => {
    let errorMsg: string;
    const bodies = req.body;

    // Validate parameters and fields
    if (
      isEmpty(bodies.type) ||
      isEmpty(bodies.accountName) ||
      isEmpty(bodies.from) ||
      isEmpty(bodies.to) ||
      isEmpty(bodies.message)
    ) {
      errorMsg = "'type', 'accountName', 'from', 'to', 'message' are required.";
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
    const processTime = Date.now();
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    const balanceTable = process.env.AWS_DYNAMO_DB_TABLE_BALANCE;

    try {
      // Setup AWS config before using AWS services
      AWS.config.update({
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
        region: process.env.APP_AWS_REGION,
      });
      // Create DynamoDB client
      const docClient = new AWS.DynamoDB.DocumentClient();
      // Setup update params
      const updateParams = {
        TableName: balanceTable,
        Key: { account_name: req.body.accountName },
        UpdateExpression: "",
        ExpressionAttributeValues: {},
      };

      // Send notification based on type
      switch (req.body.type) {
        case "sms":
          let deductCredit = 0;
          if (process.env.SMS_ENABLED) {
            const twilioRes = await twilioClient.messages.create({
              body: req.body.message,
              to: req.body.to,
              from: req.body.from,
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

      // await docClient.put(putProcessedParams).promise();

      // Send notification via email
      // for (let i = 0; i < getEmailsRes.Items.length; i++) {
      //   const emailContent = {
      //     to: getEmailsRes.Items[i].email,
      //     from: "ats-sftp@freshturf.org", // Use the email address or domain you verified above
      //     subject: "[SFTP] No new files received",
      //     text: `No new movement files (wstsmov) received. Generated: ${
      //       new Date(processTime).toLocaleString("SG") + " SGT"
      //     }`,
      //   };
      //   // Send emails when error occured.
      //   sendGrid.setApiKey(process.env.SEND_GRID_API_KEY_SECRET);
      //   await sendGrid.send(emailContent);
      // }

      res.status(HTTP_OK).end();
    } catch (err) {
      return next(
        new CustomError(
          HTTP_INTERNAL_SERVER_ERROR,
          "Error occured while sending notification.",
          null
        )
      );
    }
    // res.send(apiResponse(HTTP_OK, "Test ok.", null));
  });
}
