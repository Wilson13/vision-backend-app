import mongoose, { Schema, Document } from "mongoose";

export interface FaceInterface extends Document {
  phoneNumber: string;
  userDesc: string; // externalImageId
  faceId: string;
}

const FaceSchema: Schema = new Schema({
  phoneNumber: { type: String, required: true, unique: true },
  userDesc: { type: String, required: true, unique: true },
  faceId: { type: String, required: true, unique: true },
});

FaceSchema.post<FaceInterface>("save", function (err, doc, next) {
  if (err) {
    next(new Error(err));
  }
});

//Export function to create "SomeModel" model class
//module.exports = mongoose.model('Face', FaceSchema);

// Export the model and return your IFace interface
export default mongoose.model<FaceInterface>("Face", FaceSchema);
