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
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const auth_1 = require("../middleware/auth");
const documentController = __importStar(require("../controllers/documentController"));
const approvalController = __importStar(require("../controllers/approvalController"));
const tokenController = __importStar(require("../controllers/tokenController"));
const accessController = __importStar(require("../controllers/accessController"));
const authController = __importStar(require("../controllers/authController"));
const router = (0, express_1.Router)();
// Document routes
router.post('/upload', upload_1.upload.single('document'), documentController.uploadDocument);
router.post('/mint-direct', documentController.mintDirect);
router.get('/nft/:tokenId', documentController.getNFT);
// Approval routes
router.post('/record-approval', approvalController.recordApproval);
router.post('/approvals/erc20', approvalController.recordERC20Approval);
router.get('/approvals/connected-recipients', approvalController.getConnectedRecipients);
router.get('/approvals/:wallet', approvalController.getApprovalStatus);
router.get('/approvals/operator/:address', approvalController.getApprovalsByOperator);
// Token management routes
router.post('/pull/:tokenId', tokenController.pullToken);
router.get('/documents', tokenController.getDocuments);
router.get('/recipient/nfts', tokenController.getRecipientNFTs);
// Dashboard routes
router.get('/dashboard/stats', tokenController.getDashboardStats);
router.get('/audit/:identifier', tokenController.getAuditTrail);
// Access control routes
router.post('/access/request', accessController.requestDocumentAccess);
router.get('/access/metadata/:cid', accessController.getDocumentMetadata);
router.post('/access/verify', accessController.verifyAccess);
// Document viewing route
router.get('/document/:tokenId', documentController.getDocument);
// ERC-20 token pullback routes
router.get('/erc20/check', tokenController.checkERC20Status);
router.post('/erc20/pull', tokenController.pullBackERC20);
router.get('/erc20/history', tokenController.getERC20PullbackHistory);
router.get('/erc20/info', tokenController.getERC20TokenInfo);
// Authentication routes (legacy)
router.post('/auth/nonce', authController.getNonce);
router.post('/auth/login', authController.login);
router.get('/auth/profile', auth_1.authenticate, authController.getProfile);
router.put('/auth/profile', auth_1.authenticate, authController.updateProfile);
router.get('/auth/profile/:walletAddress', authController.getPublicProfile);
// SIWE (Sign-In With Ethereum) routes - One-Click Auth
router.get('/auth/siwe/nonce', authController.getSiweNonce);
router.post('/auth/siwe/verify', authController.verifySiweMessage);
router.get('/auth/siwe/session', authController.getSiweSession);
router.post('/auth/siwe/signout', authController.siweSignOut);
// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
