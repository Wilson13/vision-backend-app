import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";

export interface OTPInterface extends Document {
  otp: string;
  createdAt: Date;
}

// Set to 120 seconds TTL for now, [expires] option takes parameter in as second.
// MongoDB: "The background task that removes expired documents runs every 60 seconds".
const OTPSchema: Schema = new Schema({
  otp: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, index: { expires: 120 } },
});

// OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5 });
OTPSchema.post<OTPInterface>("save", handleSaveError);

// Export the model and return your IToken interface
export default mongoose.model<OTPInterface>("OTP", OTPSchema);
