import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";
import { BaseSchema } from "./base_schema";
import {
  CASE_STATUS_OPEN,
  CASE_STATUS_CLOSED,
  CASE_STATUS_COMPLETED,
  CASE_STATUS_PROCESSING,
  CASE_CATEGORY_NORMAL,
  CASE_CATEGORY_MINISTER,
  CASE_CATEGORY_WELFARE,
} from "../utils/constants";
import { v4 as uuidv4 } from "uuid";

export interface CaseInterface extends Document {
  uid: string;
  userId: string;
  nric: string;
  subject: string;
  description: string;
  language: string;
  status: string;
  category: string;
  refId: string;
  location: string;
  queueNo: number;
  whatsappCall: boolean;
  assignee: string; // kioskManager uuid
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
        return content.length <= 80;
      },
      "Maximum characters allowed is 280.",
    ],
  },
  description: {
    type: String,
    required: true,
    validate: [
      function (content): boolean {
        return content.length <= 280;
      },
      "Maximum characters allowed is 280.",
    ],
  },
  language: { type: String, required: true },
  status: {
    type: String,
    default: CASE_STATUS_OPEN,
    enum: [
      CASE_STATUS_OPEN,
      CASE_STATUS_PROCESSING,
      CASE_STATUS_CLOSED,
      CASE_STATUS_COMPLETED,
    ],
  },
  category: {
    type: String,
    default: CASE_CATEGORY_NORMAL,
    enum: [CASE_CATEGORY_NORMAL, CASE_CATEGORY_WELFARE, CASE_CATEGORY_MINISTER],
  },
  refId: { type: String, required: true },
  location: { type: String, required: true },
  queueNo: { type: Number, required: true },
  whatsappCall: { type: Boolean, default: false },
  assignee: String,
});

// Compund index
// CaseSchema.index({ createdAt: 1, location: 1, queueNo: 1 }, { unique: true });
CaseSchema.post<CaseInterface>("save", handleSaveError);

export default mongoose.model<CaseInterface>("Case", CaseSchema);
