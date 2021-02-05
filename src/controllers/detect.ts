import vision from "@google-cloud/vision";
import fs from "fs";
import AWS from "aws-sdk";

import { RequestHandler } from "express";
import { body, ValidationChain } from "express-validator";
import { promises as fsPromises } from "fs";
import isEmpty from "validator/lib/isEmpty";

import asyncHandler from "../utils/async_handler";
import { CustomError } from "../utils/helper";
import { logger } from "../utils/logger";
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_REQUEST,
  ACCOUNT_EMART,
  ACCOUNT_ATS,
} from "../utils/constants";

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

    // Check file type
    if (req.file) {
      const fileName = req.file.originalname;
      if (
        !(
          fileName.endsWith(".jpeg") ||
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".png")
        )
      ) {
        errorMsg = "'image' can only be a jpeg or png file.";
      }
    } else {
      errorMsg = "File with field name 'image' is required.";
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

type Vertex = {
  x: string;
  y: string;
};

type ResponseObj = {
  name: string;
  confidence: string;
  bounds: Vertex[];
};

export function detectObject(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // Creates a client
    const client = new vision.ImageAnnotatorClient();
    const assetFile = `assets/street.jpeg`;
    const file = req.file.path;
    const buffer = fs.readFileSync(file);
    const request = {
      image: { content: buffer },
    };
    const resJSON: ResponseObj[] = [];
    const [result] = await client.objectLocalization(request);
    const objects = result.localizedObjectAnnotations;
    objects.forEach((object) => {
      const resObj = <ResponseObj>{};
      logger.debug(`Name: ${object.name}`);
      logger.debug(`Confidence: ${object.score}`);
      resObj.name = object.name;
      resObj.confidence = object.score.toString();
      resObj.bounds = [];

      const vertices = object.boundingPoly.normalizedVertices;
      vertices.forEach((v) => {
        const vertex: Vertex = <Vertex>{};
        logger.debug(`x: ${v.x}, y:${v.y}`);
        vertex.x = v.x.toString();
        vertex.y = v.y.toString();
        resObj.bounds.push(vertex);
      });
      resJSON.push(resObj);
    });
    res.status(HTTP_OK).send(resJSON);
  });
}
