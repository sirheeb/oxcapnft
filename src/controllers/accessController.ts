import { Request, Response } from 'express';
import NFT from '../models/NFT';
import ipfsService from '../services/ipfsService';
import litProtocolService from '../services/litProtocolService';
import encryptionService from '../services/encryptionService';
import { createAuditLog } from '../middleware/auditLog';

/**
 * Request access to decrypt a document
 * POST /api/access/request
 */
export const requestDocumentAccess = async (req: Request, res: Response) => {
  try {
    const { tokenId, walletAddress, signature } = req.body;

    if (!tokenId || !walletAddress || !signature) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields' },
      });
    }

    // Get NFT from database
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        success: false,
        error: { message: 'NFT not found' },
      });
    }

    // Verify wallet address matches recipient
    if (nft.recipientAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Wallet address does not match NFT recipient' },
      });
    }

    // In production, verify signature here
    // const message = `Access document ${tokenId}`;
    // const isValid = await signatureService.verifyMessage(message, signature, walletAddress);
    // if (!isValid) {
    //   return res.status(403).json({
    //     success: false,
    //     error: { message: 'Invalid signature' },
    //   });
    // }

    // Return access information
    // In production, this would use Lit Protocol to return the decryption key
    // For now, we return the metadata needed for client-side decryption

    // Create audit log
    await createAuditLog('document_access_requested', walletAddress, req, {
      tokenId,
    }, tokenId);

    res.json({
      success: true,
      data: {
        tokenId,
        encryptedCID: nft.encryptedCID,
        metadataCID: nft.metadataCID,
        tokenURI: nft.tokenURI,
        accessConditions: nft.documentMetadata.accessConditions,
        // Note: In production, encryption keys would be managed by Lit Protocol
        message: 'Access granted. Use Lit Protocol to decrypt the document.',
      },
    });
  } catch (error: any) {
    console.error('Error requesting document access:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to request document access',
      },
    });
  }
};

/**
 * Get document metadata from IPFS
 * GET /api/access/metadata/:cid
 */
export const getDocumentMetadata = async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing CID' },
      });
    }

    // Fetch metadata from IPFS
    const metadataBuffer = await ipfsService.fetchFromIPFS(cid);
    const metadata = JSON.parse(metadataBuffer.toString());

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error: any) {
    console.error('Error getting metadata:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get metadata',
      },
    });
  }
};

/**
 * Verify user has access to a document
 * POST /api/access/verify
 */
export const verifyAccess = async (req: Request, res: Response) => {
  try {
    const { tokenId, walletAddress } = req.body;

    if (!tokenId || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields' },
      });
    }

    // Get NFT from database
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        success: false,
        error: { message: 'NFT not found' },
      });
    }

    // Check if wallet matches recipient
    const hasAccess = nft.recipientAddress.toLowerCase() === walletAddress.toLowerCase();

    // Could also check on-chain ownership if minted
    // const owner = await blockchainService.getTokenOwner(tokenId);
    // const isOwner = owner.toLowerCase() === walletAddress.toLowerCase();

    res.json({
      success: true,
      data: {
        hasAccess,
        tokenId,
        recipientAddress: nft.recipientAddress,
        status: nft.status,
      },
    });
  } catch (error: any) {
    console.error('Error verifying access:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to verify access',
      },
    });
  }
};
