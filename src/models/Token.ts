import mongoose, { Schema, Document } from 'mongoose';

export interface IToken extends Document {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  color: string;
  isActive: boolean;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TokenSchema: Schema = new Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    decimals: {
      type: Number,
      required: true,
      default: 18,
    },
    icon: {
      type: String,
      default: '💰',
    },
    color: {
      type: String,
      default: 'from-gray-400 to-gray-600',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: String,
      required: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

TokenSchema.index({ isActive: 1 });
TokenSchema.index({ symbol: 1 });

export default mongoose.model<IToken>('Token', TokenSchema);
