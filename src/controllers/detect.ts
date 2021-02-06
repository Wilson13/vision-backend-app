import AWS from "aws-sdk";
import getImageSize from "image-size";
import fs from "fs";
import sharp from "sharp";
import vision from "@google-cloud/vision";

import { RequestHandler } from "express";
import isEmpty from "validator/lib/isEmpty";

import asyncHandler from "../utils/async_handler";
import { CustomError } from "../utils/helper";
import { logger } from "../utils/logger";
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  BUCKET_NAME,
  PROCESS_IMAGE_NAME,
} from "../utils/constants";
import { ISize } from "image-size/dist/types/interface";

type Vertex = {
  x: number;
  y: number;
};

type ResponseObj = {
  name: string;
  confidence: string;
  bounds: Vertex[];
};

type JSONResponse = {
  detectRes: ResponseObj[];
  url: string;
};

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

export function detectObject(): RequestHandler {
  return asyncHandler(async (req, res) => {
    // Creates a client
    const client = new vision.ImageAnnotatorClient();

    // Prepare file
    // const assetFile = `assets/street.jpeg`;
    const file = req.file.path;
    const imgSize = getImageSize(file);
    const buffer = fs.readFileSync(file);
    const request = {
      image: { content: buffer },
    };

    // Prepare variables for Vision API
    const apiRes: JSONResponse = { detectRes: [], url: "" };

    // Call Vision API for Object Detection
    const [result] = await client.objectLocalization(request);
    const objects = result.localizedObjectAnnotations;

    // Process each returned object
    objects.forEach((object) => {
      const resObj = <ResponseObj>{};
      // logger.debug(`Name: ${object.name}`);
      // logger.debug(`Confidence: ${object.score}`);
      resObj.name = object.name;
      resObj.confidence = object.score.toString();
      resObj.bounds = [];

      const vertices = object.boundingPoly.normalizedVertices;
      vertices.forEach((v) => {
        const vertex: Vertex = <Vertex>{};
        // logger.debug(`x: ${v.x}, y:${v.y}`);
        vertex.x = v.x;
        vertex.y = v.y;
        resObj.bounds.push(vertex);
      });
      apiRes.detectRes.push(resObj);
    });

    // Draw bounding boxes and include image in the response to caller
    apiRes.url = await drawBoundingBoxes(buffer, imgSize, apiRes.detectRes);
    res.status(HTTP_OK).send(apiRes);
  });
}

export function detectObjectAssetImage(): RequestHandler {
  return asyncHandler(async (req, res) => {
    // Creates a client
    const client = new vision.ImageAnnotatorClient();

    // Prepare file
    const assetFile = `assets/street.jpeg`;
    // const file = req.file.path;
    const imgSize = getImageSize(assetFile);
    const buffer = fs.readFileSync(assetFile);
    const request = {
      image: { content: buffer },
    };

    // Prepare variables for Vision API
    const apiRes: JSONResponse = { detectRes: [], url: "" };

    // Call Vision API for Object Detection
    const [result] = await client.objectLocalization(request);
    const objects = result.localizedObjectAnnotations;

    // Process each returned object
    objects.forEach((object) => {
      const resObj = <ResponseObj>{};
      // logger.debug(`Name: ${object.name}`);
      // logger.debug(`Confidence: ${object.score}`);
      resObj.name = object.name;
      resObj.confidence = object.score.toString();
      resObj.bounds = [];

      const vertices = object.boundingPoly.normalizedVertices;
      vertices.forEach((v) => {
        const vertex: Vertex = <Vertex>{};
        // logger.debug(`x: ${v.x}, y:${v.y}`);
        vertex.x = v.x;
        vertex.y = v.y;
        resObj.bounds.push(vertex);
      });
      apiRes.detectRes.push(resObj);
    });

    // Draw bounding boxes and include image in the response to caller
    apiRes.url = await drawBoundingBoxes(buffer, imgSize, apiRes.detectRes);
    res.status(HTTP_OK).send(apiRes);
  });
}

/**
 * Draw bounding boxes with a given file (image), image size, and the vertices stored in ResponseObj object array.
 * @param imageBuffer
 * @param imageSize
 * @param resObjs
 */
async function drawBoundingBoxes(
  imageBuffer: Buffer,
  imageSize: ISize,
  resObjs: ResponseObj[]
) {
  // Create S3 service object
  const s3client = new AWS.S3({
    apiVersion: "2006-03-01",
    httpOptions: { timeout: 3000 },
  });
  // Will generate an array of SVG rectangles
  const svgRectangles: string[] = [];
  // console.log(imageFile);
  logger.debug(imageSize);
  logger.debug(resObjs);

  resObjs.forEach((obj) => {
    // Generate a new random hex color for each bounding box
    const boxColor = "#" + Math.floor(Math.random() * 16777215).toString(16); // Will be something like #FF9900

    // For each bounding box, we generate an SVG rectangle as described here:
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect
    // The order of vertices stored in ResponseObj started from bottom left of the box, and goes anti-clockwise.
    // The bounds are from NormalizedVertices, which requires multiplication with image dimension to get the actual coordinates on image.
    const width = (obj.bounds[1].x - obj.bounds[0].x) * imageSize.width;
    const height = (obj.bounds[3].y - obj.bounds[0].y) * imageSize.height;
    const svgRec =
      ` <rect height="` +
      height +
      `" width="` +
      width +
      `" x="` +
      obj.bounds[0].x * imageSize.width +
      `" y="` +
      obj.bounds[0].y * imageSize.height +
      `"
  style="fill: none; stroke: ` +
      boxColor +
      `; stroke-width: 5"/>`;
    svgRectangles.push(svgRec);
  });

  logger.debug(svgRectangles);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  let svgElement =
    `<svg height="` +
    metadata.height +
    `" width="` +
    metadata.width +
    `" viewbox="0 0 ` +
    metadata.width +
    ` ` +
    metadata.height +
    `" xmlns="http://www.w3.org/2000/svg">`;
  svgElement += svgRectangles.join();
  svgElement += `</svg>`;

  // The SVG string we have crafted above needs to be converted into a Buffer object
  // so that we can use Sharp to overlay it with our image buffer
  const svgElementBuffer = Buffer.from(svgElement);

  // Create a random file name for the rendered image file we will create
  // Note we are assuming all images being passed in are JPEGs to keep things simple
  // Now we create a new image buffer combining the original image buffer with the buffer we generated
  // with our SVG bounding box rectangles
  const outputbuffer = await image
    .composite([{ input: svgElementBuffer }])
    .toBuffer();

  await writeFileS3(s3client, outputbuffer, PROCESS_IMAGE_NAME);
  return await getPreSignedURL(s3client, PROCESS_IMAGE_NAME);
}

/**
 * Generate files to be uploaded onto SFTP. The S3 objects have prefix of `Outbound/Generated/`.
 * @param s3client
 * @param file // Full path to file
 * @param fileName
 */
async function writeFileS3(s3client: AWS.S3, fileContent: Buffer, fileName) {
  // Setting up S3 upload parameters
  const s3UploadParams = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: fileContent,
  };

  await s3client.upload(s3UploadParams).promise();
}

/**
 * Get pre-signed URL for accessing the S3 object.
 * @param s3client
 * @param fileName
 */
async function getPreSignedURL(s3client: AWS.S3, fileName) {
  // Setting up S3 upload parameters
  const s3params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
  };

  return await s3client.getSignedUrlPromise("getObject", s3params);
}
