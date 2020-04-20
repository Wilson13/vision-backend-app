import User, { UserInterface } from "../models/user";
import Phone, { PhoneInterface } from "../models/phone";
import asyncHandler from "../utils/async_handler";
import { RequestHandler } from "express";
import { apiResponse, CustomError } from "../utils/helper";
import { HTTP_BAD_REQUEST, HTTP_OK, HTTP_NOT_FOUND } from "../utils/constants";
import { Error } from "mongoose";
import { validatePhone } from "./phone";
import validator from "validator";
import { isNullOrUndefined } from "util";

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
export function validateUser(user: UserInterface): CustomError {
  if (!user) return new CustomError(HTTP_BAD_REQUEST, "User is required", null);
  else if (
    !user.nric ||
    !user.email ||
    !user.name ||
    !user.phone ||
    !user.race ||
    !user.gender ||
    !user.maritalStatus ||
    !user.occupation ||
    !user.blockHseNo ||
    !user.address ||
    !user.flatType
  ) {
    return new CustomError(
      HTTP_BAD_REQUEST,
      "nric, email, name, phone, race, gender, maritalStatus, occupation, blockHseNo, address, flatType are required",
      user
    );
  } else if (validateNRIC(user.nric)) {
    return validateNRIC(user.nric);
  } else if (!validator.isEmail(user.email))
    return new CustomError(HTTP_BAD_REQUEST, "invalid email ", user);
  else return null;
}

// Display list of all Users.
export function getUsers(): RequestHandler {
  // Requires the export function remain as function not a middleware
  // so we can wrap asyncHandler here instead of at /routes level.

  // Meaning we can do
  // router.get('/',  getUsers());
  // instead of
  // router.get('/',  asyncHandler(getUsers));
  return asyncHandler(async (req, res) => {
    const userDocs = await User.find({}, { _id: 0, __v: 0 })
      .populate("phone")
      .exec();
    res.send(apiResponse(HTTP_OK, "Users retrieved.", userDocs));
  });
}

// Create a new user
export function createUser(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const phone = req.body.phone;
    // Return error if validation of phone fails
    let err = validatePhone(phone);
    if (err) return next(err);
    const phoneDoc = new Phone(req.body.phone);
    await phoneDoc.save();

    // Return error if validation of user fails
    const user = req.body;
    err = validateUser(user);
    if (err) {
      // Delete phone created earlier
      await Phone.deleteOne({ _id: phoneDoc._id });
      return next(err);
    }

    // Reference phone created earlier
    user.phone = phoneDoc._id;
    const userDoc = new User(user);

    // Save User with newly added Phone's id
    await userDoc.save();
    res.send(apiResponse(HTTP_OK, "User created.", userDoc));
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
      return next(new Error("DELETE /user/:uid/ is required"));
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
    const userDoc = await User.findOne({ nric: nric }, { _id: 0, __v: 0 });
    if (!userDoc)
      return next(new CustomError(HTTP_NOT_FOUND, "User not found.", req.body));
    else {
      return res.send(apiResponse(HTTP_OK, "User found.", userDoc));
    }
  });
}
