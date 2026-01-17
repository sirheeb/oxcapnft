import mongoose, { Schema, Document } from 'mongoose';

export interface IApproval extends Document {
  walletAddress: string;
  operatorAddress: string;
  isApproved: boolean;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  recordedAt: Date;
}

const ApprovalSchema: Schema = new Schema(
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
    isApproved: {
      type: Boolean,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
    },
    blockNumber: {
      type: Number,
      required: true,
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

// Compound index for approval queries
ApprovalSchema.index({ walletAddress: 1, operatorAddress: 1 });

export default mongoose.model<IApproval>('Approval', ApprovalSchema);
