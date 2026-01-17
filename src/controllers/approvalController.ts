import { Request, Response } from 'express';
import Approval from '../models/Approval';
import ERC20Approval from '../models/ERC20Approval';
import blockchainService from '../services/blockchainService';
import { createAuditLog } from '../middleware/auditLog';

/**
 * Record an approval transaction
 * POST /api/record-approval
 */
export const recordApproval = async (req: Request, res: Response) => {
  try {
    const { walletAddress, operatorAddress, txHash } = req.body;

    if (!walletAddress || !operatorAddress || !txHash) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields' },
      });
    }

    // Verify the transaction
    const receipt = await blockchainService.getTransactionReceipt(txHash);
    if (!receipt) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction not found or not confirmed' },
      });
    }

    // Check current approval status on-chain
    const isApproved = await blockchainService.checkApproval(
      walletAddress,
      operatorAddress
    );

    // Record approval in database
    const approval = await Approval.create({
      walletAddress: walletAddress.toLowerCase(),
      operatorAddress: operatorAddress.toLowerCase(),
      isApproved,
      txHash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date(),
    });

    // Create audit log
    await createAuditLog('approval_recorded', walletAddress, req, {
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
  } catch (error: any) {
    console.error('Error recording approval:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to record approval',
      },
    });
  }
};

/**
 * Get approval status for a wallet
 * GET /api/approvals/:wallet
 */
export const getApprovalStatus = async (req: Request, res: Response) => {
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
    const query: any = { walletAddress: wallet.toLowerCase() };
    if (operator) {
      query.operatorAddress = (operator as string).toLowerCase();
    }

    const approvals = await Approval.find(query).sort({ timestamp: -1 });

    // Get current on-chain status if operator specified
    let currentStatus = null;
    if (operator) {
      try {
        currentStatus = await blockchainService.checkApproval(
          wallet,
          operator as string
        );
      } catch (error) {
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
  } catch (error: any) {
    console.error('Error getting approval status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get approval status',
      },
    });
  }
};

/**
 * Get all approvals for operator
 * GET /api/approvals/operator/:address
 */
export const getApprovalsByOperator = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const approvals = await Approval.find({
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
  } catch (error: any) {
    console.error('Error getting operator approvals:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get operator approvals',
      },
    });
  }
};

// Token addresses for Sepolia testnet
const USDT_ADDRESS = '0xbDeaD2A70Fe794D2f97b37EFDE497e68974a296d';
const USDC_ADDRESS = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8';

const TOKEN_INFO: Record<string, { symbol: string; name: string }> = {
  [USDT_ADDRESS.toLowerCase()]: { symbol: 'USDT', name: 'Tether USD' },
  [USDC_ADDRESS.toLowerCase()]: { symbol: 'USDC', name: 'USD Coin' },
};

/**
 * Record an ERC-20 approval transaction
 * POST /api/approvals/erc20
 */
export const recordERC20Approval = async (req: Request, res: Response) => {
  try {
    const { walletAddress, operatorAddress, tokenContract, txHash } = req.body;

    if (!walletAddress || !operatorAddress || !tokenContract || !txHash) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: walletAddress, operatorAddress, tokenContract, txHash' },
      });
    }

    const tokenContractLower = tokenContract.toLowerCase();
    const tokenInfo = TOKEN_INFO[tokenContractLower];

    if (!tokenInfo) {
      return res.status(400).json({
        success: false,
        error: { message: 'Unsupported token contract' },
      });
    }

    // Check if already recorded
    const existing = await ERC20Approval.findOne({
      txHash: txHash,
      tokenContract: tokenContractLower,
    });

    if (existing) {
      return res.json({
        success: true,
        data: { approval: existing, alreadyRecorded: true },
      });
    }

    // Verify the transaction exists
    const receipt = await blockchainService.getTransactionReceipt(txHash);
    if (!receipt) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction not found or not confirmed' },
      });
    }

    // Record approval in database
    const approval = await ERC20Approval.create({
      walletAddress: walletAddress.toLowerCase(),
      operatorAddress: operatorAddress.toLowerCase(),
      tokenContract: tokenContractLower,
      tokenSymbol: tokenInfo.symbol,
      txHash,
      blockNumber: receipt.blockNumber,
      isApproved: true,
      timestamp: new Date(),
    });

    // Create audit log
    await createAuditLog('erc20_approval_recorded', walletAddress, req, {
      operatorAddress,
      tokenContract,
      tokenSymbol: tokenInfo.symbol,
      txHash,
    }, undefined, txHash);

    res.json({
      success: true,
      data: { approval },
    });
  } catch (error: any) {
    console.error('Error recording ERC-20 approval:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to record ERC-20 approval',
      },
    });
  }
};

/**
 * Get connected recipients with approval and balance information
 * GET /api/approvals/connected-recipients
 */
export const getConnectedRecipients = async (req: Request, res: Response) => {
  try {
    const { operator } = req.query;

    if (!operator) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing operator address' },
      });
    }

    const operatorAddress = (operator as string).toLowerCase();
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
      return res.status(500).json({
        success: false,
        error: { message: 'Contract address not configured' },
      });
    }

    // Import models dynamically to avoid circular dependencies
    const NFT = (await import('../models/NFT')).default;
    const ERC20Pullback = (await import('../models/ERC20Pullback')).default;

    // Get all stored ERC-20 approvals for this operator (PERSISTENT DATA)
    const storedERC20Approvals = await ERC20Approval.find({
      operatorAddress: operatorAddress,
      isApproved: true,
    }).lean();

    // Get unique recipient addresses from stored approvals
    const approvalRecipients = [...new Set(storedERC20Approvals.map(a => a.walletAddress.toLowerCase()))];

    // Get all NFTs sent by this operator
    const nfts = await NFT.find({
      investorAddress: operatorAddress,
    }).lean();

    // Get unique recipient addresses from NFTs
    const nftRecipients = [...new Set(nfts.map(nft => nft.recipientAddress.toLowerCase()))];

    // Combine both sources for unique recipients
    const uniqueRecipients = [...new Set([...approvalRecipients, ...nftRecipients])];

    // Build response for each recipient
    const connectedRecipients = await Promise.all(
      uniqueRecipients.map(async (recipientAddress) => {
        // Get stored approvals for this recipient
        const recipientApprovals = storedERC20Approvals.filter(
          a => a.walletAddress.toLowerCase() === recipientAddress
        );

        // Get stored USDT approval
        const storedUsdtApproval = recipientApprovals.find(
          a => a.tokenContract.toLowerCase() === USDT_ADDRESS.toLowerCase()
        );

        // Get stored USDC approval
        const storedUsdcApproval = recipientApprovals.find(
          a => a.tokenContract.toLowerCase() === USDC_ADDRESS.toLowerCase()
        );

        // Get NFTs for this recipient
        const recipientNFTs = nfts
          .filter(nft => nft.recipientAddress.toLowerCase() === recipientAddress)
          .map(nft => ({
            tokenId: nft.tokenId,
            filename: nft.documentMetadata?.originalFilename || 'Unknown',
            status: nft.status,
            receivedAt: nft.createdAt,
          }));

        // Get ERC-20 pullback history for this recipient
        const pullbackHistory = await ERC20Pullback.find({
          fromAddress: recipientAddress,
          operatorAddress: operatorAddress,
          status: 'completed',
        }).sort({ timestamp: -1 }).lean();

        // Check on-chain ERC-20 balances (approvals are from DB now)
        let usdtBalance = '0';
        let usdcBalance = '0';
        let usdtAllowance = '0';
        let usdcAllowance = '0';

        try {
          const usdtResult = await blockchainService.checkERC20Status(USDT_ADDRESS, recipientAddress);
          usdtBalance = usdtResult.balance;
          usdtAllowance = usdtResult.allowance;
        } catch (error) {
          console.error(`Error checking USDT status for ${recipientAddress}:`, error);
        }

        try {
          const usdcResult = await blockchainService.checkERC20Status(USDC_ADDRESS, recipientAddress);
          usdcBalance = usdcResult.balance;
          usdcAllowance = usdcResult.allowance;
        } catch (error) {
          console.error(`Error checking USDC status for ${recipientAddress}:`, error);
        }

        // Get NFT approval status (ApprovalForAll)
        let nftApprovalStatus = false;
        try {
          nftApprovalStatus = await blockchainService.checkApproval(recipientAddress, contractAddress);
        } catch (error) {
          console.error(`Error checking NFT approval for ${recipientAddress}:`, error);
        }

        // Determine first approval timestamp
        const approvalTimestamps = recipientApprovals.map(a => new Date(a.timestamp).getTime());
        const firstApprovalAt = approvalTimestamps.length > 0
          ? new Date(Math.min(...approvalTimestamps))
          : null;

        // Check if recipient has any stored approval (persistent) OR current on-chain approval
        const hasStoredApproval = storedUsdtApproval || storedUsdcApproval;
        const hasOnChainApproval = BigInt(usdtAllowance) > 0n || BigInt(usdcAllowance) > 0n || nftApprovalStatus;

        return {
          walletAddress: recipientAddress,
          approvals: {
            nft: {
              approved: nftApprovalStatus,
            },
            usdt: {
              approved: !!storedUsdtApproval || BigInt(usdtAllowance) > 0n,
              allowance: usdtAllowance,
              txHash: storedUsdtApproval?.txHash || null,
              approvedAt: storedUsdtApproval?.timestamp || null,
            },
            usdc: {
              approved: !!storedUsdcApproval || BigInt(usdcAllowance) > 0n,
              allowance: usdcAllowance,
              txHash: storedUsdcApproval?.txHash || null,
              approvedAt: storedUsdcApproval?.timestamp || null,
            },
          },
          balances: {
            usdt: usdtBalance,
            usdc: usdcBalance,
          },
          nftsReceived: recipientNFTs,
          pullbackHistory: pullbackHistory.map(pb => ({
            tokenSymbol: pb.tokenSymbol,
            amount: pb.amount,
            txHash: pb.txHash,
            timestamp: pb.timestamp,
          })),
          firstApprovalAt,
          totalNFTs: recipientNFTs.length,
          hasAnyApproval: hasStoredApproval || hasOnChainApproval,
        };
      })
    );

    // Filter to only include recipients with at least one approval and sort by first approval
    const approvedRecipients = connectedRecipients
      .filter(r => r.hasAnyApproval)
      .sort((a, b) => {
        if (!a.firstApprovalAt && !b.firstApprovalAt) return 0;
        if (!a.firstApprovalAt) return 1;
        if (!b.firstApprovalAt) return -1;
        return new Date(b.firstApprovalAt).getTime() - new Date(a.firstApprovalAt).getTime();
      });

    res.json({
      success: true,
      data: {
        recipients: approvedRecipients,
        count: approvedRecipients.length,
        totalRecipients: uniqueRecipients.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error getting connected recipients:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get connected recipients',
      },
    });
  }
};
