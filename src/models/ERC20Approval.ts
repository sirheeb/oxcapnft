import mongoose, { Schema, Document } from 'mongoose';

export interface IERC20Approval extends Document {
  walletAddress: string;
  operatorAddress: string;
  tokenContract: string;
  tokenSymbol: string;
  txHash: string;
  blockNumber?: number;
  isApproved: boolean;
  timestamp: Date;
  recordedAt: Date;
}

const ERC20ApprovalSchema: Schema = new Schema(
  {
    walletAddress: {
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
    tokenContract: {
      type: String,
      required: true,
      lowercase: true,
    },
    tokenSymbol: {
      type: String,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
    },
    blockNumber: {
      type: Number,
    },
    isApproved: {
      type: Boolean,
      required: true,
      default: true,
    },
    timestamp: {
      type: Date,
      required: true,
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

// Compound index for efficient queries
ERC20ApprovalSchema.index({ walletAddress: 1, operatorAddress: 1, tokenContract: 1 });
ERC20ApprovalSchema.index({ operatorAddress: 1, isApproved: 1 });

// Unique index to prevent duplicate recordings for same tx
ERC20ApprovalSchema.index({ txHash: 1, tokenContract: 1 }, { unique: true });

export default mongoose.model<IERC20Approval>('ERC20Approval', ERC20ApprovalSchema);
