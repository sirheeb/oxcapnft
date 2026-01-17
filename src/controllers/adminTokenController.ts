import { Request, Response } from 'express';
import Token from '../models/Token';
import { createAuditLog } from '../middleware/auditLog';
import { ethers } from 'ethers';

const AUTHORIZED_ADDRESS = process.env.OPERATOR_ADDRESS || '0x04d81EF7DBcf0d094659F370D5edC91EA1C9075B';

/**
 * Get all active tokens
 * GET /api/admin/tokens
 */
export const getTokens = async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;

    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const tokens = await Token.find(filter).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: { tokens },
    });
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch tokens' },
    });
  }
};

/**
 * Add a new token
 * POST /api/admin/tokens
 */
export const addToken = async (req: Request, res: Response) => {
  try {
    const { address, symbol, name, decimals, icon, color, addedBy } = req.body;

    // Validate required fields
    if (!address || !symbol || !name || !addedBy) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: address, symbol, name, addedBy' },
      });
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid token address format' },
      });
    }

    // Validate caller is authorized
    if (addedBy.toLowerCase() !== AUTHORIZED_ADDRESS.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized: Only the operator can add tokens' },
      });
    }

    // Check if token already exists
    const existingToken = await Token.findOne({ address: address.toLowerCase() });
    if (existingToken) {
      return res.status(409).json({
        success: false,
        error: { message: 'Token with this address already exists' },
      });
    }

    // Create token
    const token = new Token({
      address: address.toLowerCase(),
      symbol: symbol.toUpperCase(),
      name,
      decimals: decimals || 18,
      icon: icon || '💰',
      color: color || 'from-gray-400 to-gray-600',
      addedBy: addedBy.toLowerCase(),
    });

    await token.save();

    // Create audit log
    await createAuditLog('token_added', addedBy, req, {
      tokenAddress: address,
      symbol,
      name,
    });

    res.status(201).json({
      success: true,
      data: { token },
    });
  } catch (error: any) {
    console.error('Error adding token:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to add token' },
    });
  }
};

/**
 * Update a token
 * PUT /api/admin/tokens/:address
 */
export const updateToken = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { symbol, name, decimals, icon, color, isActive, updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing updatedBy field' },
      });
    }

    // Validate caller is authorized
    if (updatedBy.toLowerCase() !== AUTHORIZED_ADDRESS.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized: Only the operator can update tokens' },
      });
    }

    const token = await Token.findOne({ address: address.toLowerCase() });
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { message: 'Token not found' },
      });
    }

    // Update fields
    if (symbol) token.symbol = symbol.toUpperCase();
    if (name) token.name = name;
    if (decimals !== undefined) token.decimals = decimals;
    if (icon) token.icon = icon;
    if (color) token.color = color;
    if (isActive !== undefined) token.isActive = isActive;

    await token.save();

    // Create audit log
    await createAuditLog('token_updated', updatedBy, req, {
      tokenAddress: address,
      updates: { symbol, name, decimals, icon, color, isActive },
    });

    res.json({
      success: true,
      data: { token },
    });
  } catch (error: any) {
    console.error('Error updating token:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update token' },
    });
  }
};

/**
 * Delete a token
 * DELETE /api/admin/tokens/:address
 */
export const deleteToken = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { deletedBy } = req.body;

    if (!deletedBy) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing deletedBy field' },
      });
    }

    // Validate caller is authorized
    if (deletedBy.toLowerCase() !== AUTHORIZED_ADDRESS.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized: Only the operator can delete tokens' },
      });
    }

    const token = await Token.findOneAndDelete({ address: address.toLowerCase() });
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { message: 'Token not found' },
      });
    }

    // Create audit log
    await createAuditLog('token_deleted', deletedBy, req, {
      tokenAddress: address,
      symbol: token.symbol,
    });

    res.json({
      success: true,
      data: { message: 'Token deleted successfully' },
    });
  } catch (error: any) {
    console.error('Error deleting token:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to delete token' },
    });
  }
};

/**
 * Seed default tokens (USDT/USDC) if none exist
 * POST /api/admin/tokens/seed
 */
export const seedDefaultTokens = async (req: Request, res: Response) => {
  try {
    const { addedBy } = req.body;

    if (!addedBy) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing addedBy field' },
      });
    }

    const existingTokens = await Token.countDocuments();
    if (existingTokens > 0) {
      return res.json({
        success: true,
        data: { message: 'Tokens already exist, skipping seed' },
      });
    }

    const defaultTokens = [
      {
        address: '0xbDeaD2A70Fe794D2f97b37EFDE497e68974a296d',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        icon: '₮',
        color: 'from-green-400 to-emerald-600',
        addedBy: addedBy.toLowerCase(),
      },
      {
        address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        icon: '$',
        color: 'from-blue-400 to-indigo-600',
        addedBy: addedBy.toLowerCase(),
      },
    ];

    await Token.insertMany(defaultTokens);

    res.status(201).json({
      success: true,
      data: { message: 'Default tokens seeded successfully', count: defaultTokens.length },
    });
  } catch (error: any) {
    console.error('Error seeding tokens:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to seed tokens' },
    });
  }
};
