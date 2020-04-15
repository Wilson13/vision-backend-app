import mongoose, { Schema, Document } from "mongoose";
import { handleSaveError } from "../utils/helper";
export interface BaseSchemaInterface extends Document {
  createdAt: Date;
}

// export function BaseSchema(): void {
//   // eslint-disable-next-line prefer-rest-params
//   Schema.apply(this, arguments);

//   this.add({
//     createdAt: Date,
//   });
// }
// util.inherits(BaseSchema, Schema);

export const BaseSchema: Schema = new Schema({
  createdAt: { type: Date, default: Date.now },
});

BaseSchema.post<BaseSchemaInterface>("save", handleSaveError);

export default mongoose.model<BaseSchemaInterface>("BaseSchema", BaseSchema);
