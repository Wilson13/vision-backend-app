import { RequestHandler } from "express";
import { Error } from "mongoose";
import validator from "validator";
import { isNullOrUndefined } from "util";
import AWS from "aws-sdk";
import path from "path";
import fs from "fs";

import Case from "../models/case";
import User, { UserInterface } from "../models/user";
import Phone, { PhoneInterface } from "../models/phone";
import asyncHandler from "../utils/async_handler";
import { apiResponse, CustomError } from "../utils/helper";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_NOT_FOUND,
  CASE_STATUS_OPEN,
  HTTP_CONFLICT,
  ERROR_MSG_RACE,
  ERROR_MSG_GENDER,
  ERROR_MSG_MARITAL_STATUS,
  ERROR_MSG_POSTAL,
  ERROR_MSG_BLOCK_HOUSE_NO,
  ERROR_MSG_ADDRESS,
  ERROR_MSG_FLAT_TYPE,
  ERROR_MSG_OCCUPATION,
  HTTP_INTERNAL_SERVER_ERROR,
  ERROR_MSG_NAME,
  ERROR_MSG_EMAIL,
  ERROR_MSG_LANGUAGE,
  ERROR_MSG_NO_OF_CHILDREN,
  ERROR_MSG_FLOOR_NO,
  ERROR_MSG_UNIT_NO,
  ERROR_UPDATE_FIELD,
  ERROR_MSG_PHONE_NUMBER_FORMAT,
} from "../utils/constants";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const postalRegex = /^\d{6}$/;

export async function findUserByPhone(
  userPhone: PhoneInterface
): Promise<UserInterface> {
  // Search for phone
  const phoneDoc = await Phone.findOne({
    countryCode: userPhone.countryCode,
    number: userPhone.number,
  });

  if (isNullOrUndefined(phoneDoc)) return null;

  return User.findOne({ phone: phoneDoc._id });
}

export function validateNRIC(nric: string): CustomError {
  const nricRegex = /^(S|T|F|G)\d{7}.$/;

  if (!nric)
    return new CustomError(HTTP_BAD_REQUEST, "nric is required", {
      nric: nric,
    });
  else if (!nricRegex.test(nric))
    return new CustomError(HTTP_BAD_REQUEST, "nric format is wrong", {
      nric: nric,
    });
  else return null;
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{8}$/;

  if (!phoneRegex.test(phone)) return false;
  else return true;
}

function validateRace(race): boolean {
  // If race field does not equal to any of the following value, return false.
  if (
    race == "chinese" ||
    race == "malay" ||
    race == "indian" ||
    race == "other"
  ) {
    return true;
    // return "race has to be either ['chinese'|'malay'|'indian'|'other']";
  } else return false;
}

function validateGender(gender): boolean {
  // If race field does not equal to any of the following value, return false.
  if (gender == "male" || gender == "female") {
    return true;
    // return "race has to be either ['chinese'|'malay'|'indian'|'other']";
  } else return false;
}

function validateMaritalStatus(maritalStatus): boolean {
  // If race field does not equal to any of the following value, return false.
  if (
    maritalStatus == "single" ||
    maritalStatus == "married" ||
    maritalStatus == "divorced"
  ) {
    return true;
    // return "race has to be either ['chinese'|'malay'|'indian'|'other']";
  } else return false;
}

// function validateNonMandatoryUserData(patchUser): string {
//   return null;
// }

// Validate input format for user, format will
// only be checked if that field is provided.
// No mandatory check is included.
function validateUserDataFormat(userData): string {
  const noOfChildrenRegex = /^\d+$/;

  // Check name
  if (
    !isNullOrUndefined(userData.name) &&
    !validator.isLength(userData.name, { max: 50 })
  )
    return ERROR_MSG_NAME;
  // Check email
  if (!isNullOrUndefined(userData.email) && !validator.isEmail(userData.email))
    return ERROR_MSG_EMAIL;
  // FIXME: CHECK DOB
  // Check race
  else if (!isNullOrUndefined(userData.race) && !validateRace(userData.race))
    return ERROR_MSG_RACE;
  // Check gender
  else if (!isNullOrUndefined(userData.gender) && validateGender(userData.race))
    return ERROR_MSG_GENDER;
  // Check language
  else if (
    !isNullOrUndefined(userData.language) &&
    !validator.isLength(userData.language, { max: 50 })
  )
    return ERROR_MSG_LANGUAGE;
  // Check noOfChildren
  else if (
    !isNullOrUndefined(userData.noOfChildren) &&
    (!noOfChildrenRegex.test(userData.noOfChildren) ||
      userData.noOfChildren > 20)
  ) {
    // Needed second clause to prevent throwing
    // "Cast to number failed for value 'value' at path 'noOfChildren'"
    // if userData.noOfChildren is alphebetical because
    // checking > 20 with alphebet will always return false.
    return ERROR_MSG_NO_OF_CHILDREN;
  }
  // Check maritalStatus
  else if (
    !isNullOrUndefined(userData.maritalStatus) &&
    !validateMaritalStatus(userData.maritalStatus)
  )
    return ERROR_MSG_MARITAL_STATUS;
  // Check occupation
  else if (
    !isNullOrUndefined(userData.occupation) &&
    !validator.isLength(userData.occupation, { max: 50 })
  )
    return ERROR_MSG_OCCUPATION;
  // Check phone
  // TODO: Don't allow phone update for now, also, each case is attached with it's own contact no.
  // else if (
  //   !isNullOrUndefined(userData.phone)
  //   // &&
  //   // !isNullOrUndefined(validatePhoneFormat(userData.phone))
  // ) {
  //   return ERROR_MSG_PHONE_UPDATE;
  // }
  else if (!validatePhone(userData.phone)) {
    return ERROR_MSG_PHONE_NUMBER_FORMAT;
  }
  // return validatePhoneFormat(userData.phone);
  // Check postalCode
  else if (
    !isNullOrUndefined(userData.postalCode) &&
    !postalRegex.test(userData.postalCode)
  )
    return ERROR_MSG_POSTAL;
  // Check blockHseNo
  else if (
    !isNullOrUndefined(userData.blockHseNo) &&
    !validator.isLength(userData.blockHseNo, { max: 50 })
  )
    return ERROR_MSG_BLOCK_HOUSE_NO;
  // Check floorNo
  else if (
    !isNullOrUndefined(userData.floorNo) &&
    !validator.isLength(userData.blockHseNo, { max: 20 })
  )
    return ERROR_MSG_FLOOR_NO;
  // Check unitNo
  else if (
    !isNullOrUndefined(userData.unitNo) &&
    !validator.isLength(userData.unitNo, { max: 10 })
  )
    return ERROR_MSG_UNIT_NO;
  // Check address
  else if (
    !isNullOrUndefined(userData.address) &&
    !validator.isLength(userData.address, { max: 50 })
  )
    return ERROR_MSG_ADDRESS;
  else if (
    !isNullOrUndefined(userData.flatType) &&
    !validator.isLength(userData.flatType, { max: 20 })
  )
    return ERROR_MSG_FLAT_TYPE;
  else return null;
}

// Only one extra check is required when updating user, NRIC cannnot be changed.
function validatePatchUser(patchUser): string {
  // Check NRIC
  if (!isNullOrUndefined(patchUser.nric))
    return "nric is not allowed to change";
  else if (
    !isNullOrUndefined(patchUser.otp) ||
    !isNullOrUndefined(patchUser.accessToken) ||
    !isNullOrUndefined(patchUser.verificationCode) ||
    !isNullOrUndefined(patchUser.authServer) ||
    !isNullOrUndefined(patchUser.uid)
  )
    return ERROR_UPDATE_FIELD;
  else return validateUserDataFormat(patchUser);
}

/**
 * This function was created to keep input validation outside of models,
 * which resulted in it being required in multiple places. Reason for not
 * relying on mongoose validation is not only because it should be handled
 * before data layer, but also to return 400 BAD REQEUST for invalid input,
 * rather than 500 INTERNAL SERVER ERROR that will be returned upon main app.ts
 * error capturing mechanism. In summary, it's an active error handling.
 *
 * @param user UserInterface
 * @returns CustomError
 */
export function validateCreateUser(user: UserInterface): CustomError {
  if (!user) return new CustomError(HTTP_BAD_REQUEST, "User is required", null);
  else if (
    !user.nric ||
    !user.name ||
    !user.phone ||
    !user.race ||
    !user.gender ||
    !user.maritalStatus ||
    !user.occupation ||
    !user.postalCode ||
    !user.blockHseNo ||
    !user.address ||
    !user.flatType
  ) {
    return new CustomError(
      HTTP_BAD_REQUEST,
      "nric, name, phone, race, gender, maritalStatus, occupation, postalCode, blockHseNo, address, flatType are required",
      user
    );
  } else if (validateNRIC(user.nric)) {
    return validateNRIC(user.nric);
    // } else if (!isNullOrUndefined(user.email) && !validator.isEmail(user.email))
    //   return new CustomError(HTTP_BAD_REQUEST, "invalid email ", user);
    // else if (validateRace(user.race)) {
    //   return new CustomError(HTTP_BAD_REQUEST, ERROR_MSG_RACE, user);
    // } else if (!validator.isNumeric(user.postalCode.toString())) {
    //   return new CustomError(
    //     HTTP_BAD_REQUEST,
    //     "postalCode needs to be a number",
    //     user
    //   );
    // } else if (
    //   user.noOfChildren &&
    //   !validator.isNumeric(user.noOfChildren.toString())
    // ) {
    //   return new CustomError(
    //     HTTP_BAD_REQUEST,
    //     "noOfChildren needs to be a number",
    //     user
    //   );
  } else return null;
}

/**
 * Display list of all Users.
 */
export function getUsers(): RequestHandler {
  // Requires the export function remain as function not a middleware
  // so we can wrap asyncHandler here instead of at /routes level.

  // Meaning we can do
  // router.get('/',  getUsers());
  // instead of
  // router.get('/',  asyncHandler(getUsers));
  return asyncHandler(async (req, res) => {
    const userDocs = await User.find({}, { _id: 0, __v: 0 }).exec();
    res.send(apiResponse(HTTP_OK, "Users retrieved.", userDocs));
  });
}

/**
 * Create a new user
 */
export function createUser(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    // Return error if validation of user fails
    const user = req.body;
    const err = validateCreateUser(user);

    if (err) {
      // Delete phone created earlier
      return next(err);
    } else if (user.dob != null && !dateRegex.test(user.dob)) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "Please send dob in ISO 8601 format (yyyy-MM-dd).",
          req.body
        )
      );
    } else if (user.dob != null) {
      const dob = new Date(user.dob);
      user["dob"] = dob;
    }

    const patchUserValStr = validateUserDataFormat(req.body);
    if (!isNullOrUndefined(patchUserValStr)) {
      return next(new CustomError(HTTP_BAD_REQUEST, patchUserValStr, req.body));
    }

    // Reference phone created earlier
    const userDoc = new User(user);

    // Save User with newly added Phone's id
    await userDoc.save();
    res.send(apiResponse(HTTP_OK, "User created.", userDoc));
  });
}

/**
 * Update an existing user
 */
export function updateUser(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (req.params?.uid) {
      const userId = req.params?.uid;
      const data = req.body;

      // Check if user exists
      const result = await User.findOne({
        uid: userId,
      }).exec();

      if (!result) {
        // If user not found
        data["uid"] = req.params.uid;

        return next(
          new CustomError(HTTP_BAD_REQUEST, "User not found", req.body)
        );
      } else {
        // User found
        const patchUserValStr = validatePatchUser(req.body);

        // If there's problem with patch user data provided
        if (!isNullOrUndefined(patchUserValStr))
          return next(
            new CustomError(HTTP_BAD_REQUEST, patchUserValStr, req.body)
          );
        else {
          // If there's no problem with patch user data provided, update user data.
          const patchedUser = await User.findOneAndUpdate(
            { uid: userId },
            req.body,
            { new: true }
          );

          if (patchedUser) {
            res
              .status(HTTP_OK)
              .send(apiResponse(HTTP_OK, "User updated successfully", data));
          } else {
            return next(
              new CustomError(
                HTTP_INTERNAL_SERVER_ERROR,
                "User update failed.",
                req.body
              )
            );
          }
        }
      }
    }
    // If no uid was provided, return error.
    else {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "PATCH /user/:uid/, 'uid' is required.",
          req.body
        )
      );
    }

    console.log("updateuser");
  });
}

/**
 * Upload a photo of one user
 * */
export function uploadUserPhoto(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (req.params?.uid) {
      // If file is not found
      if (req.file == undefined)
        return next(
          new CustomError(HTTP_BAD_REQUEST, "Image file is required.", null)
        );

      // Obtain file extension
      const fileExt = path.extname(req.file.originalname);

      if (fileExt != ".jpg") {
        // Accept only one type of extension to facilitate download
        return next(
          new CustomError(HTTP_BAD_REQUEST, "Only .jpg file is accepted.", null)
        );
      }

      // Check if user exists
      const userId = req.params?.uid;
      const result = await User.findOne({
        uid: userId,
      }).exec();

      if (!result) {
        // If user not found
        return next(new CustomError(HTTP_BAD_REQUEST, "User not found.", null));
      } else {
        // User found, upload photo to AMAZON S3 bucket
        // Set the region
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
          const bucketName = process.env.AWS_BUCKET_NAME;
          // Use user's uid as the key plus the extension type of the original file
          const photoKey = userId + fileExt;

          const params = {
            Bucket: bucketName,
            Key: photoKey,
            Body: req.file.buffer,
            // ACL: "public-read",
          };

          const uploadRes = await s3.upload(params).promise();
          return res.status(HTTP_OK).send(
            apiResponse(HTTP_OK, "Successfully uploaded photo.", {
              data: uploadRes,
            })
          );
        } catch (err) {
          return next(
            new CustomError(
              HTTP_BAD_REQUEST,
              "There was an error uploading the photo.",
              // { err: err }
              null
            )
          );
        }
      }
    }
    // If no uid was provided, return error.
    else {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "PATCH /user/:uid/, 'uid' is required.",
          req.body
        )
      );
    }
  });
}

/**
 * Retrieve the photo of one user
 * */
export function getUserPhoto(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (req.params?.uid) {
      // Check if user exists
      const userId = req.params?.uid;
      const result = await User.findOne({
        uid: userId,
      }).exec();

      if (!result) {
        // If user not found
        return next(new CustomError(HTTP_BAD_REQUEST, "User not found.", null));
      } else {
        try {
          // User found, retrieve photo from AMAZON S3 bucket
          // Set the region
          AWS.config.update({ region: process.env.AWS_REGION });
          // Create S3 service object
          const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

          // Bucket name
          const bucketName = process.env.AWS_BUCKET_NAME;
          // Use user's uid as the key plus the extension type of the original file
          const photoKey = userId + ".jpg";
          // URL expires in 15 minutes
          const signedUrlExpireSeconds = process.env.AWS_SIGNED_URL_EXPIRES;
          const params = {
            Bucket: bucketName,
            Key: photoKey,
          };

          // Check if object exists
          await s3.headObject(params).promise();
          params["Expires"] = signedUrlExpireSeconds;
          const url = s3.getSignedUrl("getObject", params);

          return res.status(HTTP_OK).send(
            apiResponse(HTTP_OK, "Retrieved photo successfully.", {
              url: url,
              validity: "3 min",
            })
          );
        } catch (err) {
          let errMsg;
          let statusCode = HTTP_BAD_REQUEST;
          if (!(isNullOrUndefined(err?.code) && err.code == "NotFound")) {
            errMsg = "No image found for user";
            statusCode = HTTP_NOT_FOUND;
          } else {
            errMsg = "There was an error uploading the photo.";
          }
          return next(new CustomError(statusCode, errMsg, null));
        }
      }
    }
    // If no uid was provided, return error.
    else {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "PATCH /user/:uid/, 'uid' is required.",
          req.body
        )
      );
    }
  });
}

// This function error handler is handled by asyncHandler that calls it
export function deleteUser(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    let result, msg, status, data;

    if (req.params?.uid) {
      result = await User.findOneAndDelete({ uid: req.params.uid }).exec();

      if (result) {
        status = HTTP_OK;
        msg = `User '${result.nric}' delete successfully`;
        data = result;
      } else {
        status = HTTP_BAD_REQUEST;
        msg = `Something went wrong, user not deleted.`;
        data = { uid: req.params.uid };
      }

      // Since this statement is used for both success and failure of deletion,
      // status needs to be explicitly stated for the case of failure.
      res.status(status).send(apiResponse(status, msg, data));
    } else {
      return next(new Error("DELETE /user/:uid/, 'uid' is required"));
    }
  });
}

// Search for a user, POST method is used for form submit etc.
export function searchUser(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const nric = req.body.nric;

    // Return error if validation fails
    const err = validateNRIC(nric);
    if (err) return next(err);

    // Search for user with NRIC
    const userDoc = await User.findOne(
      { nric: nric },
      { _id: 0, __v: 0 }
    ).exec();
    if (!userDoc)
      return next(new CustomError(HTTP_NOT_FOUND, "User not found.", req.body));
    else {
      return res.send(apiResponse(HTTP_OK, "User found.", userDoc));
    }
  });
}

// Create a new case that reference the user
export function createCase(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (
      !req.body.subject ||
      !req.body.description ||
      !req.body.language ||
      !req.body.location ||
      !req.body.date
    ) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "subject, description, language, location, date is required.",
          req.body
        )
      );
    } else if (req.body.subject.length > 80) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "Maximum characters allowed for subject is 80.",
          req.body
        )
      );
    } else if (req.body.description.length > 280) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "Maximum characters allowed for description is 280.",
          req.body
        )
      );
    } else if (req.body.language.length > 80) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "Maximum characters allowed for language is 80.",
          req.body
        )
      );
    } else if (!dateRegex.test(req.body.date)) {
      return next(
        new CustomError(
          HTTP_BAD_REQUEST,
          "Please send date in ISO 8601 format (yyyy-MM-dd).",
          req.body
        )
      );
    } else if (!isNullOrUndefined(req.body.whatsappCall)) {
      // Validate whatsappCall
      if (!validator.isBoolean(req.body.whatsappCall)) {
        return next(
          new CustomError(
            HTTP_BAD_REQUEST,
            "whatsappCall has to be string [true|false]",
            req.body
          )
        );
      } else {
        const tempVal = req.body.whatsappCall;
        req.body.whatsappCall = tempVal == "true" ? true : false;
      }
    }
    if (req.params?.uid) {
      const userDoc = await User.findOne({ uid: req.params.uid }).exec();

      if (!userDoc) {
        return next(
          new CustomError(HTTP_NOT_FOUND, "User not found.", {
            uid: req.params.uid,
          })
        );
      }

      // Pprepare data
      const {
        subject,
        location,
        description,
        whatsappCall,
        language,
      } = req.body;
      // Add time portion to date as user is
      // only required to provide date.
      const currentTime = new Date().toISOString();
      const todayDate = Date.parse(
        req.body.date + "T" + currentTime.split("T")[1]
      );

      // Datetime range for today
      const start = new Date(todayDate);
      const end = new Date(todayDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Search for existing open case created today, at this location, by this user.
      const existingCase = await Case.findOne({
        location: location,
        createdAt: { $gte: start, $lt: end },
        nric: userDoc.nric,
        status: CASE_STATUS_OPEN,
      }).sort({
        createdAt: -1,
      });

      if (existingCase) {
        return next(
          new CustomError(
            HTTP_CONFLICT,
            "Existing case found for user.",
            existingCase
          )
        );
      }

      // Search for cases created on today, at this location.
      const caseDoc = await Case.findOne({
        location: location,
        createdAt: { $gte: start, $lt: end },
      }).sort({
        createdAt: -1,
      });

      let newQueueNo = null;
      if (caseDoc) {
        // Incrementing queue no
        newQueueNo = caseDoc.queueNo + 1;
      } else {
        // First case of the day at this location
        newQueueNo = 1;
      }

      let caseRefId = `${userDoc.postalCode}_${userDoc.blockHseNo}`;
      if (userDoc.floorNo) caseRefId += `_${userDoc.floorNo}`;
      if (userDoc.unitNo) caseRefId += `_${userDoc.unitNo}`;

      // Doesn't use default Date.now to insert createdAt to prevent
      // database timezone differing with client timezone.
      // TODO: Configure system to timezone.
      const newCase = new Case({
        userId: userDoc.uid,
        nric: userDoc.nric,
        subject: subject,
        description: description,
        language: language,
        status: CASE_STATUS_OPEN,
        refId: caseRefId,
        location: location,
        queueNo: newQueueNo,
        whatsappCall: whatsappCall,
        createdAt: todayDate,
      });

      const savedCase = await newCase.save();
      return res.send(apiResponse(HTTP_OK, "New case created.", savedCase));
    } else {
      return next(new Error("POST /user/:uid/case, 'uid' is required"));
    }
  });
}
