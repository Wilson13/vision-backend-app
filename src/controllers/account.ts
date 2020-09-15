import { RequestHandler } from "express";
import { isEmpty, isNumber } from "validate.js";
import { body, ValidationChain } from "express-validator";
import AWS from "aws-sdk";

import asyncHandler from "../utils/async_handler";
import { apiResponse, CustomError, isoDateRegex } from "../utils/helper";
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_REQUEST,
} from "../utils/constants";

const numReg = /^\d+$/;
/**
 * Sanitizer middleware for notifications API
 */
export function sanitize(): ValidationChain[] {
  return [
    body("type").trim().escape(),
    body("paymentTotal").trim().escape(),
    body("costPerSMS").trim().escape(),
    body("topUpCredit").trim().escape(),
    body("paymentDate").trim().escape(),
  ];
}

/**
 * Validator middleware for accounts API
 * @param method
 */
export function validate(method: string): RequestHandler {
  return (req, res, next) => {
    let errorMsg: string;
    const bodies = req.body;
    const params = req.params;

    // Validate parameters and fields
    switch (method) {
      case "getBalance":
        if (isEmpty(params.accountName)) {
          errorMsg = "Route parameter 'accountName' is required.";
        }
        break;
      case "topUpBalance":
        if (isEmpty(params.accountName)) {
          errorMsg = "Route parameter 'accountName' is required.";
        } else if (
          params.accountName != "emart" &&
          params.accountName != "ats"
        ) {
          errorMsg =
            "Route parameter 'accountName' can only be ['emart'|'ats']..";
        } else if (
          isEmpty(bodies.type) ||
          isEmpty(bodies.paymentTotal) ||
          isEmpty(bodies.costPerSMS) ||
          isEmpty(bodies.topUpCredit) ||
          isEmpty(bodies.paymentDate)
        ) {
          errorMsg =
            "Body fields 'type', 'paymentTotal', 'costPerSMS', 'topUpCredit', 'paymentDate' are required.";
        } else if (bodies.type != "sms" && bodies.type != "email") {
          errorMsg = "Body field 'type' can only be ['sms'|'email'].";
        } else if (
          !isNumber(bodies.topUpCredit) &&
          !numReg.test(bodies.topUpCredit)
        ) {
          // Note that only 'topUpCredit' needs to be validated,
          // other fields are purely for references.
          errorMsg = "Body field 'topUpCredit' needs to be a number.";
        } else if (!isoDateRegex.test(bodies.paymentDate)) {
          // Note that this service doesn't expect the time portion to be accurate,
          // the time portion is just required to ensure Time offsets from UTC is set.
          errorMsg =
            "Please send paymentDate in ISO 8601 format (yyyy-MM-dd:Thh:mm[+/-]hh:mm)";
        }
        break;
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
 * Query for account balance based on account_name stored in dynamoDB.
 */
export function getBalance(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const balanceTable = process.env.AWS_DYNAMO_DB_TABLE_BALANCE;

    try {
      // Setup AWS config before using AWS services
      AWS.config.update({
        region: process.env.APP_AWS_REGION,
      });
      // Create DynamoDB client
      const docClient = new AWS.DynamoDB.DocumentClient();
      // Setup query params
      const queryParams = {
        TableName: balanceTable,
        KeyConditionExpression: "account_name = :accountName",
        ExpressionAttributeValues: {
          ":accountName": req.params.accountName,
        },
      };
      // Query for account balance
      const data = await docClient.query(queryParams).promise();
      // Polish up return data format
      let returnData;
      if (data.Items.length > 0) {
        returnData = data.Items[0];
        delete returnData.account_name;
      }
      res.send(apiResponse(HTTP_OK, returnData));
    } catch (err) {
      return next(
        new CustomError(
          HTTP_INTERNAL_SERVER_ERROR,
          "Error occured while querying for account balance.",
          err
        )
      );
    }
  });
}

/**
 * Topup for account balance based on payment.
 */
export function topUpBalance(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const smsTopupsTable = process.env.AWS_DYNAMO_DB_TABLE_SMS_TOPUPS;
    const balanceTable = process.env.AWS_DYNAMO_DB_TABLE_BALANCE;
    const accountName = req.params.accountName;
    const { paymentTotal, costPerSMS, topUpCredit, paymentDate } = req.body;

    try {
      // Setup AWS config before using AWS services
      AWS.config.update({
        region: process.env.APP_AWS_REGION,
      });
      // Create DynamoDB client
      const docClient = new AWS.DynamoDB.DocumentClient();
      // Setup put params
      const putParams = {
        TableName: smsTopupsTable,
        Item: {
          account_name: accountName,
          payment_total: paymentTotal,
          cost_per_sms: costPerSMS,
          topup_credit: topUpCredit,
          payment_date: paymentDate,
        },
      };
      // Setup update params
      const updateParams = {
        TableName: balanceTable,
        Key: { account_name: accountName },
        UpdateExpression: "SET sms_balance = sms_balance + :inc",
        ExpressionAttributeValues: { ":inc": Number(topUpCredit) },
      };

      // Put new top-up event item
      await docClient.put(putParams).promise();
      // Increase balance for this account
      await docClient.update(updateParams).promise();
      res.status(HTTP_OK).end();
    } catch (err) {
      return next(
        new CustomError(
          HTTP_INTERNAL_SERVER_ERROR,
          "Error occured while topping up for account.",
          err
        )
      );
    }
  });
}
