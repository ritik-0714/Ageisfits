import mongoose from "mongoose";
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  price: { type: Number, min: 0 },
  source: String, link: String,
  quantity: { type: Number, min: 1, default: 1 },
}, { timestamps: true });

export const CartItem = mongoose.models.CartItem || mongoose.model("CartItem", cartItemSchema);
