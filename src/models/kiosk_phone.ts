import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";
import { BaseSchema } from "./base_schema";

/**
 * Same schema and interface as Phone, but saved in a
 * different collection for differentiating Kiosk manager
 * from end user.
 */
export interface KioskPhoneInterface extends Document {
  countryCode: string;
  number: string;
}

export const KioskPhoneSchema: Schema = new Schema({
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
KioskPhoneSchema.index({ countryCode: 1, number: 1 }, { unique: true });
KioskPhoneSchema.post<KioskPhoneInterface>("save", handleSaveError);

export default mongoose.model<KioskPhoneInterface>(
  "KioskPhone",
  KioskPhoneSchema
);
