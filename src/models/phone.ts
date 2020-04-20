import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";
import { BaseSchema } from "./base_schema";

export interface PhoneInterface extends Document {
  countryCode: string;
  number: string;
}

export const PhoneSchema: Schema = new Schema({
  ...BaseSchema.obj,
  countryCode: { type: String, required: true },
  number: {
    type: String,
    required: true,
    unique: true,
    validate: [
      function (phone): boolean {
        const phoneRegex = /^(\d{8})?$/;
        return phoneRegex.test(phone);
      },
      "phone.number needs to be 8-digit long.",
    ],
  },
});

// Compund index
PhoneSchema.index({ countryCode: 1, number: 1 }, { unique: true });
PhoneSchema.post<PhoneInterface>("save", handleSaveError);

export default mongoose.model<PhoneInterface>("Phone", PhoneSchema);
