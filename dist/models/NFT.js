"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const NFTSchema = new mongoose_1.Schema({
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
            type: mongoose_1.Schema.Types.Mixed,
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
}, {
    timestamps: true,
});
// Compound indexes for common queries
NFTSchema.index({ recipientAddress: 1, status: 1 });
NFTSchema.index({ investorAddress: 1, createdAt: -1 });
exports.default = mongoose_1.default.model("NFT", NFTSchema);
