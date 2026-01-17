import { Router } from 'express';
import { upload } from '../middleware/upload';
import { authenticate } from '../middleware/auth';
import * as documentController from '../controllers/documentController';
import * as approvalController from '../controllers/approvalController';
import * as tokenController from '../controllers/tokenController';
import * as accessController from '../controllers/accessController';
import * as authController from '../controllers/authController';

const router = Router();

// Document routes
router.post('/upload', upload.single('document'), documentController.uploadDocument);
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
router.get('/auth/profile', authenticate, authController.getProfile);
router.put('/auth/profile', authenticate, authController.updateProfile);
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

export default router;
