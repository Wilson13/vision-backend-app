import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";

export interface ConfigInterface extends Document {
  type: string;
  bearerTokenExpiry: string;
}

const ConfigSchema: Schema = new Schema({
  type: { type: String, required: true },
  bearerTokenExpiry: { type: String, required: true }
});

ConfigSchema.post<ConfigInterface>("save", handleSaveError);

// Export the model and return your IConfig interface
export default mongoose.model<ConfigInterface>("Config", ConfigSchema);
