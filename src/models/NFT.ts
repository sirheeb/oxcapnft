import mongoose, { Schema, Document } from "mongoose";

export interface INFT extends Document {
  tokenId: string;
  recipientAddress: string;
  investorAddress: string;
  tokenURI: string;
  encryptedCID: string;
  metadataCID: string;
  status: "uploaded" | "minted" | "redeemed" | "pulled" | "revoked";
  mintTxHash?: string;
  pullTxHash?: string;
  documentMetadata: {
    originalFilename: string;
    fileSize: number;
    encryptionScheme: string;
    accessConditions: any;
    documentData?: string; // Base64 encoded document for fast access
    mimeType?: string; // MIME type of the document
    ipfsCID?: string; // Real IPFS CID (updated asynchronously)
  };
  createdAt: Date;
  updatedAt: Date;
}

const NFTSchema: Schema = new Schema(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    recipientAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    investorAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    tokenURI: {
      type: String,
      required: true,
    },
    encryptedCID: {
      type: String,
      required: true,
    },
    metadataCID: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["uploaded", "minted", "redeemed", "pulled", "revoked"],
      default: "uploaded",
      index: true,
    },
    mintTxHash: {
      type: String,
      sparse: true,
    },
    pullTxHash: {
      type: String,
      sparse: true,
    },
    documentMetadata: {
      originalFilename: {
        type: String,
        required: true,
      },
      fileSize: {
        type: Number,
        required: true,
      },
      encryptionScheme: {
        type: String,
        required: true,
        default: "AES-GCM-256",
      },
      accessConditions: {
        type: Schema.Types.Mixed,
        required: false,
        default: {},
      },
      documentData: {
        type: String,
        required: false,
      },
      mimeType: {
        type: String,
        required: false,
      },
      ipfsCID: {
        type: String,
        required: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
NFTSchema.index({ recipientAddress: 1, status: 1 });
NFTSchema.index({ investorAddress: 1, createdAt: -1 });

export default mongoose.model<INFT>("NFT", NFTSchema);
