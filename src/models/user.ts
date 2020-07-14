import mongoose, { Schema, Document } from "mongoose";
import { HTTP_CONFLICT } from "../utils/constants";
import { CustomError } from "../utils/helper";
import { BaseSchema } from "./base_schema";
import { v4 as uuidv4 } from "uuid";

/**
 * This model only stored User's UUID when user sign up on Cognito.
 */
export interface UserInterface extends Document {
  uid: string;
}

const UserSchema: Schema = new Schema({
  ...BaseSchema.obj,
  uid: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
  },
});

UserSchema.post<UserInterface>("save", function (err, doc, next) {
  if (err) {
    if (err.name === "MongoError" && err.code === 11000) {
      // According to RFC 7231, Conflicts are most likely to occur in
      // response to a PUT request but it's used for POST request too.
      const keys = Object.keys(err.keyValue);
      return next(
        new CustomError(
          HTTP_CONFLICT,
          `Duplicates found: '${keys[0]}'`,
          err.keyValue
          // doc
        )
      );
    }
    // Bubble up
    return next(err);
  }
});

// UserSchema.post<UserInterfaceDeprecated>("findOneAndDelete", async function (doc) {
//   if (doc && doc.phone) await Phone.deleteOne({ _id: doc.phone });
// });

export default mongoose.model<UserInterface>("User", UserSchema);
