import { RequestHandler } from "express";
import validator from "validator";
import isEmpty from "validator/lib/isEmpty";
import { body, ValidationChain } from "express-validator";
import AWS from "aws-sdk";

import asyncHandler from "../utils/async_handler";
import { apiResponse, CustomError, isoDateRegex } from "../utils/helper";
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_REQUEST,
  TYPE_SMS,
  TYPE_EMAIL,
  ACCOUNT_EMART,
  ACCOUNT_ATS,
} from "../utils/constants";

/**
 * Sanitizer middleware for notifications API
 */
export function sanitize(): ValidationChain[] {
  return [
    body("type").trim().escape(),
    body("paymentTotal").trim().escape(),
    body("costPerUnit").trim().escape(),
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
    let errorMsg = "";
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
          params.accountName != ACCOUNT_EMART &&
          params.accountName != ACCOUNT_ATS
        ) {
          errorMsg =
            "Route parameter 'accountName' can only be ['emart'|'ats']..";
        } else if (
          isEmpty(bodies.type) ||
          isEmpty(bodies.paymentTotal) ||
          isEmpty(bodies.costPerUnit) ||
          isEmpty(bodies.topUpCredit) ||
          isEmpty(bodies.paymentDate)
        ) {
          errorMsg =
            "Body fields 'type', 'paymentTotal', 'costPerUnit', 'topUpCredit', 'paymentDate' are required.";
        } else if (bodies.type != TYPE_SMS && bodies.type != TYPE_EMAIL) {
          errorMsg = "Body field 'type' can only be ['sms'|'email'].";
        } else if (
          !validator.isInt(bodies.topUpCredit, { min: 1, max: 20000 })
        ) {
          // Note that only 'topUpCredit' needs to be validated,
          // other fields are purely for references.
          errorMsg =
            "Body field 'topUpCredit' needs to be a number between 1 to 20000.";
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
    const emailTopupsTable = process.env.AWS_DYNAMO_DB_TABLE_EMAIL_TOPUPS;
    const balanceTable = process.env.AWS_DYNAMO_DB_TABLE_BALANCE;
    const accountName = req.params.accountName;
    let putParams, updateParams;
    const {
      type,
      paymentTotal,
      costPerUnit,
      topUpCredit,
      paymentDate,
    } = req.body;

    try {
      // Setup AWS config before using AWS services
      AWS.config.update({
        region: process.env.APP_AWS_REGION,
      });
      // Create DynamoDB client
      const docClient = new AWS.DynamoDB.DocumentClient();
      // Setup parameters params
      if (type == TYPE_SMS) {
        // Setup log transaction parameter
        putParams = {
          TableName: smsTopupsTable,
          Item: {
            account_name: accountName,
            payment_total: paymentTotal,
            cost_per_sms: costPerUnit,
            topup_credit: topUpCredit,
            payment_date: paymentDate,
          },
        };
        // Setup topup  parameter
        updateParams = {
          TableName: balanceTable,
          Key: { account_name: accountName },
          UpdateExpression: "SET sms_balance = sms_balance + :inc",
          ExpressionAttributeValues: { ":inc": Number(topUpCredit) },
        };
      } else if (type == TYPE_EMAIL) {
        // Setup log transaction parameter
        putParams = {
          TableName: emailTopupsTable,
          Item: {
            account_name: accountName,
            payment_total: paymentTotal,
            cost_per_sms: costPerUnit,
            topup_credit: topUpCredit,
            payment_date: paymentDate,
          },
        };
        // Setup topup  parameter
        updateParams = {
          TableName: balanceTable,
          Key: { account_name: accountName },
          UpdateExpression: "SET email_balance = email_balance + :inc",
          ExpressionAttributeValues: { ":inc": Number(topUpCredit) },
        };
      }

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
