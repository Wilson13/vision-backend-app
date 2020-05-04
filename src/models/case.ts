import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";
import { BaseSchema } from "./base_schema";
import {
  CASE_STATUS_OPEN,
  CASE_STATUS_MINISTER,
  CASE_STATUS_UNCONTACTABLE,
} from "../utils/constants";
import { v4 as uuidv4 } from "uuid";

export interface CaseInterface extends Document {
  uid: string;
  userId: string;
  nric: string;
  subject: string;
  status: string;
  refId: string;
  location: string;
  queueNo: number;
  whatsappCall: boolean;
}

export const CaseSchema: Schema = new Schema({
  ...BaseSchema.obj,
  uid: { type: String, required: true, unique: true, default: uuidv4 },
  userId: { type: String, required: true },
  nric: { type: String, required: true },
  subject: {
    type: String,
    required: true,
    validate: [
      function (content): boolean {
        return content.length <= 280;
      },
      "Maximum characters allowed is 280.",
    ],
  },
  status: {
    type: String,
    default: CASE_STATUS_OPEN,
    enum: [CASE_STATUS_OPEN, CASE_STATUS_MINISTER, CASE_STATUS_UNCONTACTABLE],
  },
  refId: { type: String, required: true },
  location: { type: String, required: true },
  queueNo: { type: Number, required: true },
  whatsappCall: { type: Boolean, default: false },
});

// Compund index
// CaseSchema.index({ createdAt: 1, location: 1, queueNo: 1 }, { unique: true });
CaseSchema.post<CaseInterface>("save", handleSaveError);

export default mongoose.model<CaseInterface>("Case", CaseSchema);
