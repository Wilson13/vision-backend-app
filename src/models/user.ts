import mongoose, { Schema, Document } from "mongoose";
import { HTTP_CONFLICT } from "../utils/constants";
import Phone from "./phone";
import { CustomError } from "../utils/helper";
import { BaseSchema } from "./base_schema";
import { v4 as uuidv4 } from "uuid";

export interface UserInterface extends Document {
  nric: string;
  name: string;
  dob: Date;
  race: string;
  gender: string;
  language: string;
  noOfChildren: number;
  maritalStatus: string;
  occupation: string;
  phone: object;
  email: string;
  postalCode: number;
  blockHseNo: string;
  floorNo: string;
  unitNo: string;
  address: string;
  flatType: string;
  otp: string;
  accessToken: string;
  verificationCode: string;
  authServer: string;
  uid: string;
}

const UserSchema: Schema = new Schema({
  ...BaseSchema.obj,
  nric: String,
  name: { type: String, required: true },
  dob: Date,
  race: { type: String, required: true },
  gender: { type: String, required: true },
  launguage: String,
  noOfChildren: Number,
  maritalStatus: { type: String, required: true },
  occupation: { type: String, required: true },
  phone: { type: Schema.Types.ObjectId, ref: "Phone", required: true },
  email: {
    type: String,
    unique: true,
    validate: [
      function (email): boolean {
        const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
        return emailRegex.test(email);
      },
      "The e-mail format is wrong.",
    ],
  },
  postalCode: Number,
  blockHseNo: { type: String, required: true },
  floorNo: String,
  unitNo: String,
  address: { type: String, required: true },
  flatType: { type: String, required: true },
  otp: String, // plain text?
  accessToken: String,
  verificationCode: String,
  authServer: String,
  uid: {
    type: String,
    unique: true,
    default: uuidv4,
  },
});

UserSchema.post<UserInterface>("save", function (err, doc, next) {
  if (err) {
    // Delete phone if error occured while saving user into DB
    Phone.deleteOne({ _id: doc.phone._id }, function (err) {
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

UserSchema.post<UserInterface>("findOneAndDelete", async function (doc) {
  if (doc && doc.phone) await Phone.deleteOne({ _id: doc.phone });
});

export default mongoose.model<UserInterface>("User", UserSchema);
