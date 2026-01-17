"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApprovalsByOperator = exports.getApprovalStatus = exports.recordApproval = void 0;
const Approval_1 = __importDefault(require("../models/Approval"));
const blockchainService_1 = __importDefault(require("../services/blockchainService"));
const auditLog_1 = require("../middleware/auditLog");
/**
 * Record an approval transaction
 * POST /api/record-approval
 */
const recordApproval = async (req, res) => {
    try {
        const { walletAddress, operatorAddress, txHash } = req.body;
        if (!walletAddress || !operatorAddress || !txHash) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing required fields' },
            });
        }
        // Verify the transaction
        const receipt = await blockchainService_1.default.getTransactionReceipt(txHash);
        if (!receipt) {
            return res.status(400).json({
                success: false,
                error: { message: 'Transaction not found or not confirmed' },
            });
        }
        // Check current approval status on-chain
        const isApproved = await blockchainService_1.default.checkApproval(walletAddress, operatorAddress);
        // Record approval in database
        const approval = await Approval_1.default.create({
            walletAddress: walletAddress.toLowerCase(),
            operatorAddress: operatorAddress.toLowerCase(),
            isApproved,
            txHash,
            blockNumber: receipt.blockNumber,
            timestamp: new Date(),
        });
        // Create audit log
        await (0, auditLog_1.createAuditLog)('approval_recorded', walletAddress, req, {
            operatorAddress,
            isApproved,
            txHash,
        }, undefined, txHash);
        res.json({
            success: true,
            data: {
                approval,
            },
        });
    }
    catch (error) {
        console.error('Error recording approval:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to record approval',
            },
        });
    }
};
exports.recordApproval = recordApproval;
/**
 * Get approval status for a wallet
 * GET /api/approvals/:wallet
 */
const getApprovalStatus = async (req, res) => {
    try {
        const { wallet } = req.params;
        const { operator } = req.query;
        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing wallet address' },
            });
        }
        // Get approvals from database
        const query = { walletAddress: wallet.toLowerCase() };
        if (operator) {
            query.operatorAddress = operator.toLowerCase();
        }
        const approvals = await Approval_1.default.find(query).sort({ timestamp: -1 });
        // Get current on-chain status if operator specified
        let currentStatus = null;
        if (operator) {
            try {
                currentStatus = await blockchainService_1.default.checkApproval(wallet, operator);
            }
            catch (error) {
                console.error('Error checking on-chain approval:', error);
            }
        }
        res.json({
            success: true,
            data: {
                approvals,
                currentStatus,
            },
        });
    }
    catch (error) {
        console.error('Error getting approval status:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get approval status',
            },
        });
    }
};
exports.getApprovalStatus = getApprovalStatus;
/**
 * Get all approvals for operator
 * GET /api/approvals/operator/:address
 */
const getApprovalsByOperator = async (req, res) => {
    try {
        const { address } = req.params;
        const approvals = await Approval_1.default.find({
            operatorAddress: address.toLowerCase(),
            isApproved: true,
        }).sort({ timestamp: -1 });
        res.json({
            success: true,
            data: {
                approvals,
                count: approvals.length,
            },
        });
    }
    catch (error) {
        console.error('Error getting operator approvals:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to get operator approvals',
            },
        });
    }
};
exports.getApprovalsByOperator = getApprovalsByOperator;
