import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  tokenId?: string;
  walletAddress: string;
  txHash?: string;
  metadata: any;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

const AuditLogSchema: Schema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    tokenId: {
      type: String,
      index: true,
    },
    walletAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    txHash: {
      type: String,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for audit trail queries
AuditLogSchema.index({ walletAddress: 1, timestamp: -1 });
AuditLogSchema.index({ tokenId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
