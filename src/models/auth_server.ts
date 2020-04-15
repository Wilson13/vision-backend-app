import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";
import validator from "validator";
import { BaseSchema } from "./base_schema";
/**
 * For storing authorization server URL (an indirect URL called by webhooks).
 * This replaces the URL saved in .env file to make it configurable instead of
 * being a dependency in code.
 */
export interface AuthServerInterface extends Document {
  name: string;
  url: string;
  createdAt: Date;
}

const AuthServerSchema: Schema = new Schema({
  ...BaseSchema.obj,
  name: { type: String, required: true, unique: true },
  url: {
    type: String,
    required: true,
    unique: true,
    validate: [
      function (url): boolean {
        return validator.isURL(url);
      },
      "The URL format is wrong.",
    ],
  },
});

// AuthServerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5 });
AuthServerSchema.post<AuthServerInterface>("save", handleSaveError);

// Export the model and return your IToken interface
export default mongoose.model<AuthServerInterface>(
  "AuthServer",
  AuthServerSchema
);
