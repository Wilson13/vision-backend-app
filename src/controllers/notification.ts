import { RequestHandler } from "express";
import axios from "axios";
import AWS from "aws-sdk";
import sendGrid from "@sendgrid/mail";
import twilio from "twilio";

import asyncHandler from "../utils/async_handler";
import { apiResponse, CustomError } from "../utils/helper";
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_BAD_REQUEST,
} from "../utils/constants";

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

    // Input validation
    if (
      !req.body.type ||
      !req.body.accountName ||
      !req.body.from ||
      !req.body.to ||
      !req.body.message
    ) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "type, accountName, from, to, message are required.",
          null
        )
      );
    }

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
          const twilioRes = await twilioClient.messages.create({
            body: req.body.message,
            to: req.body.to,
            from: req.body.from,
          });
          // Deduct balance from account
          updateParams.UpdateExpression =
            "set sms_balance = sms_balance - :dec";
          updateParams.ExpressionAttributeValues = {
            ":dec": Number(twilioRes.numSegments), // numSegments is a string
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
