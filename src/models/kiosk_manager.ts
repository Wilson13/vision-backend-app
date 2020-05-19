import mongoose, { Schema, Document } from "mongoose";
import { HTTP_CONFLICT } from "../utils/constants";
import KioskPhone from "./kiosk_phone";
import { CustomError } from "../utils/helper";
import { BaseSchema } from "./base_schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Kiosk manager has to sign in to auth service before
 * Kiosk App is able to utilize Meey-Queue backend APIs.
 * */

export interface KioskManagerInterface extends Document {
  email: string;
  firstName: string;
  lastName: string;
  kioskPhone: object;
  otp: string;
  accessToken: string;
  verificationCode: string;
  authServer: string;
  uid: string;
}

const KioskManagerSchema: Schema = new Schema({
  ...BaseSchema.obj,
  email: {
    type: String,
    // required: [true, "Your email address cannot be blank."],
    unique: true,
    validate: [
      function (email): boolean {
        const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
        return emailRegex.test(email);
      },
      "The e-mail format is wrong.",
    ],
  },
  firstName: { type: String },
  lastName: { type: String },
  kioskPhone: {
    type: Schema.Types.ObjectId,
    ref: "KioskPhone",
    required: true,
  },
  // password is not necessarily required, OTP might be used instead}
  otp: String, // plain text?
  accessToken: String,
  verificationCode: String,
  authServer: String,
  uid: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
  },
});

KioskManagerSchema.post<KioskManagerInterface>("save", function (
  err,
  doc,
  next
) {
  if (err) {
    // Delete phone if error occured while saving user into DB
    KioskPhone.deleteOne({ _id: doc.phone._id }, function (err) {
      if (err) return next(err);
    });
    if (err.name === "MongoError" && err.code === 11000) {
      // According to RFC 7231, Conflicts are most likely to occur in
      // response to a PUT request but it's used for POST request too.
      return next(
        new CustomError(
          HTTP_CONFLICT,
          `Duplicate key error: ${doc.constructor.modelName}`,
          doc
        )
      );
    }
    // Bubble up
    return next(err);
    // return next(new CustomError(HTTP_BAD_REQUEST, err.message, null));
  }
});

KioskManagerSchema.pre("findOneAndDelete", function () {
  console.log("test");
});

KioskManagerSchema.post<KioskManagerInterface>(
  "findOneAndDelete",
  async function (doc) {
    if (doc && doc.kioskPhone)
      await KioskPhone.deleteOne({ _id: doc.kioskPhone });
  }
);

export default mongoose.model<KioskManagerInterface>(
  "KioskManager",
  KioskManagerSchema
);
