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
const ERC20PullbackSchema = new mongoose_1.Schema({
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
}, {
    timestamps: false,
});
// Compound indexes for common queries
ERC20PullbackSchema.index({ fromAddress: 1, tokenContract: 1 });
ERC20PullbackSchema.index({ operatorAddress: 1, status: 1 });
ERC20PullbackSchema.index({ timestamp: -1 });
exports.default = mongoose_1.default.model('ERC20Pullback', ERC20PullbackSchema);
