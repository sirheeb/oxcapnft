import { Request, Response, NextFunction } from "express";
import authService from "../services/authService";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        walletAddress: string;
        userId: string;
      };
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = authService.verifyToken(token);
      req.user = {
        walletAddress: decoded.walletAddress,
        userId: decoded.userId,
      };
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
    return;
  }
};

/**
 * Optional authentication - sets user if token is valid but doesn't fail if missing
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const decoded = authService.verifyToken(token);
        req.user = {
          walletAddress: decoded.walletAddress,
          userId: decoded.userId,
        };
      } catch (error) {
        // Token invalid, but we continue without user
      }
    }

    next();
  } catch (error) {
    console.error("Optional authentication error:", error);
    next();
  }
};
