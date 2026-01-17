"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getERC20TokenInfo = exports.getERC20PullbackHistory = exports.pullBackERC20 = exports.checkERC20Status = exports.getAuditTrail = exports.getDashboardStats = exports.getRecipientNFTs = exports.getDocuments = exports.pullToken = void 0;
const NFT_1 = __importDefault(require("../models/NFT"));
const ERC20Pullback_1 = __importDefault(require("../models/ERC20Pullback"));
const blockchainService_1 = __importDefault(require("../services/blockchainService"));
const auditLog_1 = require("../middleware/auditLog");
/**
 * Pull back a token
 * POST /api/pull/:tokenId
 */
const pullToken = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { operatorAddress } = req.body;
        if (!operatorAddress) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing operatorAddress' },
            });
        }
        // Get NFT from database
        const nft = await NFT_1.default.findOne({ tokenId });
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: { message: 'NFT not found' },
            });
        }
        if (nft.status !== 'minted' && nft.status !== 'redeemed') {
            return res.status(400).json({
                success: false,
                error: { message: 'NFT not yet minted or redeemed' },
            });
        }
        // Get current owner from blockchain
        const currentOwner = await blockchainService_1.default.getTokenOwner(tokenId);
        // Check if operator is approved
        const isApproved = await blockchainService_1.default.checkApproval(currentOwner, operatorAddress);
        if (!isApproved) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Operator not approved by token owner',
                    details: {
                        currentOwner,
                        operatorAddress,
                    },
                },
            });
        }
        // Pull token back
        console.log(`Pulling back token ${tokenId} from ${currentOwner}...`);
        const txHash = await blockchainService_1.default.pullToken(currentOwner, tokenId);
        // Update NFT status
        nft.status = 'pulled';
        nft.pullTxHash = txHash;
        await nft.save();
        // Create audit log
        await (0, auditLog_1.createAuditLog)('token_pulled', operatorAddress, req, {
            tokenId,
            fromAddress: currentOwner,
            txHash,
        }, tokenId, txHash);
        res.json({
            success: true,
            data: {
                tokenId,
                txHash,
                fromAddress: currentOwner,
                toAddress: operatorAddress,
                nft,
            },
        });
    }
    catch (error) {
        console.error('Error pulling token:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to pull token',
            },
        });
    }
};
exports.pullToken = pullToken;
/**
 * Get all documents/NFTs for an investor
 * GET /api/documents
 */
const getDocuments = async (req, res) => {
    try {
        const { investorAddress, status } = req.query;
        const query = {};
        if (investorAddress) {
            query.investorAddress = investorAddress.toLowerCase();
        }
        if (status) {
            query.status = status;
        }
        const documents = await NFT_1.default.find(query).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: {
                documents,
                count: documents.length,
            },
        });
    }
    catch (error) {
        console.error('Error getting documents:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get documents',
            },
        });
    }
};
exports.getDocuments = getDocuments;
/**
 * Get all NFTs for a recipient
 * GET /api/recipient/nfts
 */
const getRecipientNFTs = async (req, res) => {
    try {
        const { recipientAddress, status } = req.query;
        if (!recipientAddress) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing recipientAddress' },
            });
        }
        const query = {
            recipientAddress: recipientAddress.toLowerCase(),
        };
        if (status) {
            query.status = status;
        }
        const nfts = await NFT_1.default.find(query).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: {
                nfts,
                count: nfts.length,
            },
        });
    }
    catch (error) {
        console.error('Error getting recipient NFTs:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get recipient NFTs',
            },
        });
    }
};
exports.getRecipientNFTs = getRecipientNFTs;
/**
 * Get dashboard statistics for investor
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
    try {
        const { investorAddress } = req.query;
        if (!investorAddress) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing investorAddress' },
            });
        }
        const address = investorAddress.toLowerCase();
        // Get counts by status
        const totalDocuments = await NFT_1.default.countDocuments({ investorAddress: address });
        const uploaded = await NFT_1.default.countDocuments({ investorAddress: address, status: 'uploaded' });
        const minted = await NFT_1.default.countDocuments({ investorAddress: address, status: 'minted' });
        const redeemed = await NFT_1.default.countDocuments({ investorAddress: address, status: 'redeemed' });
        const pulled = await NFT_1.default.countDocuments({ investorAddress: address, status: 'pulled' });
        // Get recent documents
        const recentDocuments = await NFT_1.default.find({ investorAddress: address })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({
            success: true,
            data: {
                stats: {
                    totalDocuments,
                    uploaded,
                    minted,
                    redeemed,
                    pulled,
                },
                recentDocuments,
            },
        });
    }
    catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get dashboard stats',
            },
        });
    }
};
exports.getDashboardStats = getDashboardStats;
/**
 * Get audit trail
 * GET /api/audit/:identifier
 */
const getAuditTrail = async (req, res) => {
    try {
        const { identifier } = req.params;
        const { type } = req.query; // 'wallet' or 'token'
        const query = {};
        if (type === 'wallet') {
            query.walletAddress = identifier.toLowerCase();
        }
        else if (type === 'token') {
            query.tokenId = identifier;
        }
        else {
            // Try to determine automatically
            if (identifier.startsWith('0x')) {
                query.walletAddress = identifier.toLowerCase();
            }
            else {
                query.tokenId = identifier;
            }
        }
        const AuditLog = require('../models/AuditLog').default;
        const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(100);
        res.json({
            success: true,
            data: {
                logs,
                count: logs.length,
            },
        });
    }
    catch (error) {
        console.error('Error getting audit trail:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get audit trail',
            },
        });
    }
};
exports.getAuditTrail = getAuditTrail;
/**
 * Check ERC-20 token balance and allowance
 * GET /api/erc20/check
 */
const checkERC20Status = async (req, res) => {
    try {
        const { tokenContract, holder } = req.query;
        if (!tokenContract || !holder) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing tokenContract or holder address' },
            });
        }
        // Get token info
        const tokenInfo = await blockchainService_1.default.getERC20TokenInfo(tokenContract);
        // Get balance and allowance
        const status = await blockchainService_1.default.checkERC20Status(tokenContract, holder);
        // Get contract address to check allowance against
        const contractAddress = process.env.CONTRACT_ADDRESS;
        res.json({
            success: true,
            data: {
                tokenInfo,
                balance: status.balance,
                allowance: status.allowance,
                holder: holder,
                contractAddress,
            },
        });
    }
    catch (error) {
        console.error('Error checking ERC-20 status:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to check ERC-20 token status',
            },
        });
    }
};
exports.checkERC20Status = checkERC20Status;
/**
 * Pull back ERC-20 tokens from a holder
 * POST /api/erc20/pull
 */
const pullBackERC20 = async (req, res) => {
    try {
        const { tokenContract, fromAddress, amount, operatorAddress } = req.body;
        if (!tokenContract || !fromAddress || !amount || !operatorAddress) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing required fields: tokenContract, fromAddress, amount, operatorAddress' },
            });
        }
        // Get token info
        const tokenInfo = await blockchainService_1.default.getERC20TokenInfo(tokenContract);
        // Check balance and allowance before attempting pullback
        const status = await blockchainService_1.default.checkERC20Status(tokenContract, fromAddress);
        if (BigInt(status.allowance) < BigInt(amount)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Insufficient token allowance',
                    details: {
                        required: amount,
                        current: status.allowance,
                    },
                },
            });
        }
        if (BigInt(status.balance) < BigInt(amount)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Insufficient token balance',
                    details: {
                        required: amount,
                        current: status.balance,
                    },
                },
            });
        }
        console.log(`Pulling back ${amount} ${tokenInfo.symbol} from ${fromAddress}...`);
        // Execute pullback
        const txHash = await blockchainService_1.default.pullBackERC20(tokenContract, fromAddress, amount);
        // Wait for transaction confirmation
        const receipt = await blockchainService_1.default.waitForTransaction(txHash);
        // Create database record
        const pullbackRecord = await ERC20Pullback_1.default.create({
            tokenContract: tokenContract.toLowerCase(),
            tokenSymbol: tokenInfo.symbol,
            tokenName: tokenInfo.name,
            tokenDecimals: tokenInfo.decimals,
            fromAddress: fromAddress.toLowerCase(),
            operatorAddress: operatorAddress.toLowerCase(),
            amount,
            txHash,
            blockNumber: receipt.blockNumber,
            timestamp: new Date(),
            status: 'completed',
        });
        // Create audit log
        await (0, auditLog_1.createAuditLog)('erc20_pulled', operatorAddress, req, {
            tokenContract,
            tokenSymbol: tokenInfo.symbol,
            fromAddress,
            amount,
            txHash,
        }, fromAddress, txHash);
        res.json({
            success: true,
            data: {
                txHash,
                tokenInfo,
                fromAddress,
                operatorAddress,
                amount,
                blockNumber: receipt.blockNumber,
                record: pullbackRecord,
            },
        });
    }
    catch (error) {
        console.error('Error pulling back ERC-20 tokens:', error);
        // Record failed pullback if we have enough info
        if (req.body.tokenContract && req.body.fromAddress) {
            try {
                const tokenInfo = await blockchainService_1.default.getERC20TokenInfo(req.body.tokenContract);
                await ERC20Pullback_1.default.create({
                    tokenContract: req.body.tokenContract.toLowerCase(),
                    tokenSymbol: tokenInfo.symbol,
                    tokenName: tokenInfo.name,
                    tokenDecimals: tokenInfo.decimals,
                    fromAddress: req.body.fromAddress.toLowerCase(),
                    operatorAddress: req.body.operatorAddress?.toLowerCase() || '',
                    amount: req.body.amount || '0',
                    txHash: '',
                    timestamp: new Date(),
                    status: 'failed',
                    errorMessage: error.message,
                });
            }
            catch (dbError) {
                console.error('Failed to record error in database:', dbError);
            }
        }
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to pull back ERC-20 tokens',
            },
        });
    }
};
exports.pullBackERC20 = pullBackERC20;
/**
 * Get ERC-20 pullback history
 * GET /api/erc20/history
 */
const getERC20PullbackHistory = async (req, res) => {
    try {
        const { operatorAddress, fromAddress, tokenContract, status } = req.query;
        const query = {};
        if (operatorAddress) {
            query.operatorAddress = operatorAddress.toLowerCase();
        }
        if (fromAddress) {
            query.fromAddress = fromAddress.toLowerCase();
        }
        if (tokenContract) {
            query.tokenContract = tokenContract.toLowerCase();
        }
        if (status) {
            query.status = status;
        }
        const history = await ERC20Pullback_1.default.find(query).sort({ timestamp: -1 }).limit(100);
        res.json({
            success: true,
            data: {
                history,
                count: history.length,
            },
        });
    }
    catch (error) {
        console.error('Error getting ERC-20 pullback history:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get pullback history',
            },
        });
    }
};
exports.getERC20PullbackHistory = getERC20PullbackHistory;
/**
 * Get ERC-20 token info
 * GET /api/erc20/info
 */
const getERC20TokenInfo = async (req, res) => {
    try {
        const { tokenContract } = req.query;
        if (!tokenContract) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing tokenContract address' },
            });
        }
        const tokenInfo = await blockchainService_1.default.getERC20TokenInfo(tokenContract);
        res.json({
            success: true,
            data: tokenInfo,
        });
    }
    catch (error) {
        console.error('Error getting ERC-20 token info:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get token information',
            },
        });
    }
};
exports.getERC20TokenInfo = getERC20TokenInfo;
