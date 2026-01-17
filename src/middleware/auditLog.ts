import { Request, Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog';

export const createAuditLog = async (
  action: string,
  walletAddress: string,
  req: Request,
  metadata?: any,
  tokenId?: string,
  txHash?: string
) => {
  try {
    await AuditLog.create({
      action,
      tokenId,
      walletAddress: walletAddress.toLowerCase(),
      txHash,
      metadata: metadata || {},
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

export const auditLogMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store the original json method
    const originalJson = res.json.bind(res);

    // Override res.json to capture the response
    res.json = function (body: any) {
      if (body.success && req.body.walletAddress) {
        createAuditLog(
          action,
          req.body.walletAddress,
          req,
          {
            requestBody: req.body,
            responseBody: body,
          }
        ).catch(console.error);
      }
      return originalJson(body);
    };

    next();
  };
};
