import mongoose, { Schema, Document } from 'mongoose';

export interface IERC20Pullback extends Document {
  tokenContract: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  fromAddress: string;
  operatorAddress: string;
  amount: string;
  txHash: string;
  blockNumber?: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  recordedAt: Date;
}

const ERC20PullbackSchema: Schema = new Schema(
  {
    tokenContract: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    tokenSymbol: {
      type: String,
      required: true,
    },
    tokenName: {
      type: String,
      required: true,
    },
    tokenDecimals: {
      type: Number,
      required: true,
    },
    fromAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    operatorAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    amount: {
      type: String,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
    },
    blockNumber: {
      type: Number,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for common queries
ERC20PullbackSchema.index({ fromAddress: 1, tokenContract: 1 });
ERC20PullbackSchema.index({ operatorAddress: 1, status: 1 });
ERC20PullbackSchema.index({ timestamp: -1 });

export default mongoose.model<IERC20Pullback>('ERC20Pullback', ERC20PullbackSchema);
