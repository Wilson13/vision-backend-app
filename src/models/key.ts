import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";

export interface KeyInterface extends Document {
  public: [string];
  private: [string];
  developerId: string;
}

const KeysSchema: Schema = new Schema({
  public: [String],
  private: [String],
  developerId: { type: String, unique: true }
});

KeysSchema.post<KeyInterface>("save", handleSaveError);

// Export the model and return your IKey interface
export default mongoose.model<KeyInterface>("Key", KeysSchema);
