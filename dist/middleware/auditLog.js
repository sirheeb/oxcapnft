"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogMiddleware = exports.createAuditLog = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const createAuditLog = async (action, walletAddress, req, metadata, tokenId, txHash) => {
    try {
        await AuditLog_1.default.create({
            action,
            tokenId,
            walletAddress: walletAddress.toLowerCase(),
            txHash,
            metadata: metadata || {},
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            timestamp: new Date(),
        });
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
exports.createAuditLog = createAuditLog;
const auditLogMiddleware = (action) => {
    return async (req, res, next) => {
        // Store the original json method
        const originalJson = res.json.bind(res);
        // Override res.json to capture the response
        res.json = function (body) {
            if (body.success && req.body.walletAddress) {
                (0, exports.createAuditLog)(action, req.body.walletAddress, req, {
                    requestBody: req.body,
                    responseBody: body,
                }).catch(console.error);
            }
            return originalJson(body);
        };
        next();
    };
};
exports.auditLogMiddleware = auditLogMiddleware;
