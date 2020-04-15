import User, { UserInterface } from "../models/user";
import Phone, { PhoneInterface } from "../models/phone";
import asyncHandler from "../utils/async_handler";
import { RequestHandler } from "express";
import { apiResponse, CustomError } from "../utils/helper";
import { HTTP_BAD_REQUEST, HTTP_OK } from "../utils/constants";
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

/**
 * This function was created to keep input validation outside of models,
 * which resulted in it being required in multiple places. Reason for not
 * relying on mongoose validation is not only because it should be handled
 * before data layer, but also to return 400 BAD REQEUST for invalid input,
 * rather than 500 INTERNAL SERVER ERROR that will be returned upon main app.ts
 * error capturing mechanism. In summary, it's an active error handling.
 *
 * @param phone PhoneInterface
 * @returns CustomError
 */
export function validateUser(user: UserInterface): CustomError {
  if (!user) return new CustomError(HTTP_BAD_REQUEST, "User is required", null);
  else if (!user.email || !user.name || !user.phone)
    return new CustomError(
      HTTP_BAD_REQUEST,
      "email, name, phone is required",
      user
    );
  else if (!validator.isEmail(user.email))
    return new CustomError(HTTP_BAD_REQUEST, "invalid email ", user);
  else if (validator.isEmpty(user.name))
    return new CustomError(HTTP_BAD_REQUEST, "name is required", user);
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

// export function deleteUser(): RequestHandler {
//   return asyncHandler(async (req, res, next) => {
//     if (!req.body.email) return next(new Error("Email is required"));

//     const email = req.body.email;
//     const result = await User.findOneAndDelete({ email }); // Phone associated is deleted in post remove hook

//     if (result)
//       res.send(
//         apiResponse(HTTP_OK, `User "${email}" delete successfully`, email)
//       );
//     else {
//       res
//         .status(HTTP_BAD_REQUEST)
//         .json(
//           apiResponse(
//             HTTP_BAD_REQUEST,
//             `Something went wrong, user "${email}" not deleted.`,
//             email
//           )
//         );
//     }
//   });
// }

// This function error handler is handled by asyncHandler that calls it

export function deleteUser(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    let result, email, phone, phoneStr;
    if (req.body.email) {
      email = req.body.email;
      // Delete user with email
      // Phone associated is deleted in post findOneAndDelete hook
      result = await User.findOneAndDelete({ email: email });
    } else if (req.body.phone) {
      phone = req.body.phone;
      phoneStr = JSON.stringify(phone).replace(/[\\|\"]/g, "'");

      // Return error if validation of phone fails
      const err = validatePhone(phone);
      if (err) return next(err);
      // Search for user
      const userDoc: UserInterface = await findUserByPhone(phone);
      // Return error if user was not found
      if (!userDoc)
        return next(
          new CustomError(HTTP_BAD_REQUEST, "User not found", req.body)
        );
      // Delete user with phone
      // Phone associated is deleted in post findOneAndDelete hook
      result = await User.findOneAndDelete({ phone: userDoc.phone });
    } else {
      return next(new Error("Email or phone is required"));
    }

    if (result) {
      const message = email
        ? `User '${email}' delete successfully`
        : `User '${phoneStr}' delete successfully`;
      const data = email ? email : phone;
      res.send(apiResponse(HTTP_OK, message, data));
    } else {
      const message = email
        ? `Something went wrong, user '${email}' not deleted.`
        : `Something went wrong, user '${phoneStr}' not deleted.`;
      const data = email ? email : phone;

      res
        .status(HTTP_BAD_REQUEST)
        .json(apiResponse(HTTP_BAD_REQUEST, message, data));
    }
  });
}
