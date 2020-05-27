import * as AWS from "aws-sdk";
import createHttpError from "http-errors";

import Face from "../models/face";
import asyncHandler from "../utils/async_handler";
import { RequestHandler } from "express";
import { HTTP_BAD_REQUEST, HTTP_OK } from "../utils/constants";
import { CustomError, apiResponse } from "../utils/helper";

function setupRekcognition(): AWS.Rekognition {
  // Not sure why env variable for region not,
  // working hence requires a manual update here.
  AWS.config.update({
    region: process.env.APP_AWS_REGION,
  });

  // Set up AWS SDK
  AWS.config.getCredentials(function (err) {
    if (err) throw err.stack;
    // credentials not loaded
    else {
      // TODO: Set up dev and prod env variables if they are different
    }
  });

  //let rek = new AWS.Rekognition();
  return new AWS.Rekognition();
}

// Display list of all Collections.
export function getRekCollection(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // let rek: AWS.Rekognition;
    // try {
    const rek = await setupRekcognition();
    // } catch (err) {
    //   return next(err);
    // }

    const params = {};

    rek.listCollections(params, function (err, data) {
      if (err) return next(new CustomError(HTTP_BAD_REQUEST, err.stack, err));
      // an error occurred
      else {
        res.send(
          apiResponse(HTTP_OK, "AWS Rekognition collections retrieved.", data)
        );
      }
    });
  });
}

// Display list of all Faces.
export function getFaces(): RequestHandler {
  return asyncHandler(async (req, res) => {
    const face = await Face.find({}, { _id: 0, __v: 0 });
    res.send(apiResponse(HTTP_OK, "Faces retrieved.", face));
  });
}

// Display list of all Faces.
export function getRekFaces(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (!req.body.collectionId)
      return next(
        new CustomError(HTTP_BAD_REQUEST, "collectionId required.", null)
      );

    let rek;
    try {
      rek = setupRekcognition();
    } catch (err) {
      return next(err);
    }

    const params = {
      CollectionId: req.body.collectionId /* required */,
    };

    rek.listFaces(params, function (err, data) {
      if (err) return next(createHttpError(err.stack, { data: err }));
      // an error occurred
      else {
        res.send(
          apiResponse(HTTP_OK, "AWS Rekognition faces retrieved.", data)
        );
      }
    });
  });
}

// Delete Faces
export function deleteFace(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // Check if face was deleted from Rekognition too
    let rekFaceDeleted = false;
    let rekData;

    if (req.params.phoneNumber == undefined)
      return next(createHttpError(HTTP_BAD_REQUEST, "phoneNumber is required"));

    // Search for this user's face data
    const userFaceInfo = await Face.findOne({
      phoneNumber: req.params.phoneNumber,
    }).exec();

    // If this user's face data is NOT already been added into
    // Rekognition collection (by looking up in our own DB)
    if (userFaceInfo == null) {
      return next(
        createHttpError(HTTP_BAD_REQUEST, "User's face data is not enrolled")
      );
    } else {
      let rek;
      try {
        rek = setupRekcognition();
      } catch (err) {
        return next(err);
      }

      const params = {
        CollectionId: process.env.REK_COLLECTION_ID /* required */,
        FaceIds: [userFaceInfo.faceId],
      };

      rek.deleteFaces(params, function (err, data) {
        if (err) return next(createHttpError(err.stack, { data: err }));
        // an error occurred
        else {
          // Face was deleted from Rekognition
          rekFaceDeleted = true;
          rekData = data;

          // Couldn't wait for the deleteFaces to finish as it doesn't use promises
          userFaceInfo.remove(function (err, face) {
            if (err) return next(err);
            else {
              // Did not use lean() call when finding for it
              // so we can do remove on the returned Document.
              const faceData = face.toJSON();
              if (rekFaceDeleted) {
                console.log("remove: " + JSON.stringify(faceData));
                faceData["rekognitionData"] = rekData;
              }
              res.send(faceData);
            }
          });
        }
      });
    }
  });
}

export function createFace(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (req.body.phoneNumber == undefined)
      return next(createHttpError(HTTP_BAD_REQUEST, "phoneNumber is required"));
    else if (req.body.userDesc == undefined)
      return next(createHttpError(HTTP_BAD_REQUEST, "userDesc is required"));
    else if (req.file == undefined)
      return next(createHttpError(HTTP_BAD_REQUEST, "Image file is required"));

    // Search for this user's face data
    const userFaceInfo = await Face.find({
      phoneNumber: req.body.phoneNumber,
    }).exec();

    // If this user's face data has already been added into
    // Rekognition collection (by looking up in our own DB)
    if (userFaceInfo.length) {
      return next(
        createHttpError(HTTP_BAD_REQUEST, "User's face data already exists")
      );
    } else {
      let rek;
      try {
        rek = setupRekcognition();
      } catch (err) {
        return next(err);
      }

      const buffer = req.file.buffer;
      const params = {
        CollectionId: process.env.REK_COLLECTION_ID /* required */,
        DetectionAttributes: [],
        ExternalImageId: req.body.userDesc,
        Image: {
          Bytes: buffer,
        },
      };

      rek.indexFaces(params, function (err, data) {
        if (err) return next(createHttpError(err.stack, err, 500));
        // an error occurred
        else {
          // Only save face data if detection confidence is over 90 (maybe index faces always return 100?)
          if (data.FaceRecords[0].Face.Confidence >= 90) {
            // Save faceID, phoneNumber, externalImageId into DB
            const newFace = new Face({
              userDesc: req.body.userDesc,
              phoneNumber: req.body.phoneNumber,
              faceId: data.FaceRecords[0].Face.FaceId,
            });

            newFace.save(function (err) {
              if (err) return next(err);

              res.send(JSON.stringify(data));
            });
          } else {
            // Return error response if confidence level is too low
            return next(
              createHttpError(
                HTTP_BAD_REQUEST,
                "Confidence level is lower than 90.",
                { data: data }
              )
            ); // an error occurred
            //res.status(500).json(errorJSON(500, data, "Confidence level is lower than 90."));
          }
        }
      });
    }
  });
}

export function detectFace(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (req.params.phoneNumber == undefined)
      return next(createHttpError(HTTP_BAD_REQUEST, "phoneNumber is required"));

    // Search for this user's face data
    const userFaceInfo = await Face.findOne({
      phoneNumber: req.params.phoneNumber,
    }).exec();

    // If this user's face data is NOT already been added into
    // Rekognition collection (by looking up in our own DB)
    if (userFaceInfo == null) {
      return next(
        createHttpError(HTTP_BAD_REQUEST, "User's face data is not enrolled")
      );
    } else {
      let rek;
      try {
        rek = setupRekcognition();
      } catch (err) {
        return next(err);
      }

      const buffer = req.file.buffer;
      const params = {
        CollectionId: process.env.REK_COLLECTION_ID /* required */,
        Image: {
          Bytes: buffer,
        },
        FaceMatchThreshold: 90,
        MaxFaces: 1,
      };

      rek.searchFacesByImage(params, function (err, data) {
        if (err) return next(createHttpError(500, err.message, { data: err }));
        // an error occurred
        // If a face was detected
        else if (data.FaceMatches.length > 0) {
          // If no face matches
          if (userFaceInfo.faceId != data.FaceMatches[0].Face.FaceId)
            return next(
              createHttpError(500, "Authentication failed.", { data: data })
            );
          else res.send(data);
        } else {
          return next(createHttpError(500, "No face matches", { data: data })); // an error occurred
        }
      });
    }
  });
}
