import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";

export interface TokenInterface extends Document {
  kioskPhone: object;
  token: string;
  createdAt: Date;
}

// Index will not be overridden by this call, meaning if we set expiry
// to be 60 seconds in DB, this call below will not override the new expiry.
// But in order to make expiry time dynamic, we can't read it from .env nor
// set it during runtime, the only way is to provide an API endpoint which
// upon call, will perform the aforementioned manual setting.
// Set to 5 days for now.
const TokenSchema: Schema = new Schema({
  kioskPhone: {
    type: Schema.Types.ObjectId,
    ref: "KioskPhone",
    required: true,
  },
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 432000 },
  // createdAt: { type: Date, default: Date.now } //
});

//TokenSchema.index({ createdAt: 1 }, { expireAfterSeconds : 432000 } );

TokenSchema.post<TokenInterface>("save", handleSaveError);

// Export the model and return your IToken interface
export default mongoose.model<TokenInterface>("Token", TokenSchema);
