import { RequestHandler } from "express";
import axios from "axios";
import AWS from "aws-sdk";
import sendGrid from "@sendgrid/mail";

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
 * Ideally this is not a costly function since downloaded files are removed from the SFTP, meaning we should
 * be expecting this function to be pulling and comparing less than 10 files each time.
 * Note that everything in S3 is an object, including the concept of "folder".
 */
export function checkNewFile(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
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
      const processTime = Date.now();
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

      let hasNewFile = false;
      // Create DynamoDB client
      const docClient = new AWS.DynamoDB.DocumentClient();
      // Table name
      const processedTable = process.env.AWS_DYNAMO_DB_TABLE_PROCESSED;
      const errorRecipientTable =
        process.env.AWS_DYNAMO_DB_TABLE_ERROR_RECIPIENT;

      const getProcessedParams = {
        TableName: processedTable,
        Key: {},
      };

      const putProcessedParams = {
        TableName: processedTable,
        Item: {},
      };

      try {
        // List all objects in S3 bucket "folder"
        const listObjectsRes = await s3.listObjects(params).promise();
        // Check all files in "folder" to determine if there's any new file.
        for (let i = 0; i < listObjectsRes.Contents.length; i++) {
          // Get timestamp from object key
          const startIndex = listObjectsRes.Contents[i].Key.search(/[0-9]{14}/);
          const timestamp = listObjectsRes.Contents[i].Key.slice(
            startIndex,
            startIndex + 14
          );
          // Get file name without prefix (/Inbound/Downloaded)
          const fileStartIndex = listObjectsRes.Contents[i].Key.search(
            "wstsmov"
          );
          const fileName = listObjectsRes.Contents[i].Key.slice(fileStartIndex);

          // Add primary key for reading
          getProcessedParams.Key = { timestamp: timestamp };
          // Check if this file has been processed and saved in DB
          const getItemRes = await docClient.get(getProcessedParams).promise();

          if (getItemRes.Item == null) {
            // Timestamp not found, file has not been processed before.
            // As long as there's one file not processed before, this
            // SFTP sync is successful.
            hasNewFile = true;
            // No need to save this file into the DB yet,
            // do it when decrpyt and actual processing has been done.
            // putProcessedParams.Item = { timestamp: timestamp };
            // await docClient.put(putProcessedParams).promise();
          } else {
            // Timestamp is found, file has been processed before,
            // move file to duplicated folder.
            const copyParams = {
              Bucket: bucketName,
              CopySource: bucketName + "/" + listObjectsRes.Contents[i].Key,
              Key: "Duplicated/" + fileName,
            };

            const deleteParams = {
              Bucket: bucketName,
              Key: listObjectsRes.Contents[i].Key,
            };
            // Copy to new object (renamed) and delete old object
            await s3.copyObject(copyParams).promise();
            await s3.deleteObject(deleteParams).promise();
          }
        }

        if (hasNewFile) {
          // TODO: Trigger next lambda
          res.send(
            apiResponse(HTTP_OK, "SFTP files pulled successfully", {
              Generated: new Date(processTime).toLocaleString("SG") + " SGT",
            })
          );
        } else {
          // No new files found, send emails to recipients.
          const getRecipientsParams = {
            TableName: errorRecipientTable,
            Limit: 50,
          };
          // Retrieve emails from DynamoDB
          const getEmailsRes = await docClient
            .scan(getRecipientsParams)
            .promise();

          // Send emails when error occured.
          sendGrid.setApiKey(process.env.SEND_GRID_API_KEY_SECRET);

          for (let i = 0; i < getEmailsRes.Items.length; i++) {
            const emailContent = {
              to: getEmailsRes.Items[i].email,
              from: "ats-sftp@freshturf.org", // Use the email address or domain you verified above
              subject: "[SFTP] No new files received",
              text: `No new movement files (wstsmov) received. Generated: ${
                new Date(processTime).toLocaleString("SG") + " SGT"
              }`,
            };
            await sendGrid.send(emailContent);
          }

          // console.log(getEmailsRes.Items);
          return next(
            new CustomError(
              HTTP_NOT_FOUND,
              "SFTP files pull failed, no new (unprocessed) files found.",
              { Generated: new Date(processTime).toLocaleString("SG") + " SGT" }
            )
          );
        }
      } catch (err) {
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
