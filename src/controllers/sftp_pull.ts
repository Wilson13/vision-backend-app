import { RequestHandler } from "express";
import axios from "axios";
import AWS from "aws-sdk";

import asyncHandler from "../utils/async_handler";
import { apiResponse, CustomError } from "../utils/helper";
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
} from "../utils/constants";

/**
 * Function for getting current service environment's public IP.
 * Main objective is to ensure this lambda has a static IP.
 */
export function showIP(): RequestHandler {
  return asyncHandler(async (req, res) => {
    const instance = axios.create({
      baseURL: "https://ipv4bot.whatismyipaddress.com",
      timeout: 12000,
    });
    instance.get("").then((resp) => {
      // console.log(resp.data);
      res.send(apiResponse(HTTP_OK, "Test ok.", resp.data));
    });
  });
}

/**
 * Compare the S3 Downloaded folder's file list with Dynamo DB values to see if there's any unprocessed file.
 * Note that everything is S3 is an object, including the concept of "folder".
 */
export function checkNewFile(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    try {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });

      // Create S3 service object
      const s3 = new AWS.S3({
        apiVersion: "2006-03-01",
        httpOptions: { timeout: 3000 },
      });
      // Bucket name
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      // Folder path
      const folderName = process.env.AWS_S3_PREFIX_DOWNLOADED;
      // Max number of keys to return (100)
      const maxKeys: number = parseInt(process.env.AWS_S3_MAX_KEYS);
      // List objects with the prefix of folderName + wstsmov (movement file)
      const params: AWS.S3.ListObjectsRequest = {
        Bucket: bucketName,
        Delimiter: "/",
        Prefix: folderName + "wstsmov",
        MaxKeys: maxKeys,
      };

      // Prepare DynamoDB client
      const docClient = new AWS.DynamoDB.DocumentClient();
      let hasNewFile = false;

      const table = process.env.AWS_DYNAMO_DB_TABLE_PROCESSED;

      const dbGetParams = {
        TableName: table,
        Key: {},
      };

      const dbPutParams = {
        TableName: table,
        Item: {},
      };

      try {
        const result = await s3.listObjects(params).promise();
        // console.log(result);

        for (let i = 0; i < result.Contents.length; i++) {
          // Get timestamp from file name
          const startIndex = result.Contents[i].Key.search(/[0-9]{14}/);
          const timestamp = result.Contents[i].Key.slice(
            startIndex,
            startIndex + 14
          );

          // Add primary key for reading
          dbGetParams.Key = { timestamp: timestamp };
          // Check if this file has been processed
          const itemResponse = await docClient.get(dbGetParams).promise();

          if (itemResponse.Item == null) {
            // Timestamp not found, file has not been processed before.
            // As long as there's one file not processed before, this
            // SFTP sync is successful.
            hasNewFile = true;
            // Process this file and add it into the DB.
            dbPutParams.Item = { timestamp: timestamp };
            await docClient.put(dbPutParams).promise();
          } else {
            // Timestamp is found, file has been processed before, nothing else needs to be done.
          }
        }

        if (hasNewFile) {
          res.send(
            apiResponse(HTTP_OK, "SFTP files pulled successfully", {
              Generated: Date.now(),
            })
          );
        } else {
          res.send(
            apiResponse(
              HTTP_NOT_FOUND,
              "SFTP files pull failed, no new and unprocessed files found.",
              { Generated: Date.now() }
            )
          );
        }
        // files.push(file);
      } catch (err) {
        // File not found, ignored.
        return next(
          new CustomError(
            HTTP_INTERNAL_SERVER_ERROR,
            "Error occured while processing files.",
            err
          )
        );
      }
    } catch (err) {
      return next(
        new CustomError(
          HTTP_INTERNAL_SERVER_ERROR,
          "Error occured while pulling files from SFTP.",
          null
        )
      );
    }
    // res.send(apiResponse(HTTP_OK, "Test ok.", null));
  });
}
