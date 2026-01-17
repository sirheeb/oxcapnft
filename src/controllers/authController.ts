import { Request, Response } from "express";
import authService from "../services/authService";

/**
 * Get nonce for wallet authentication
 */
export const getNonce = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400).json({ error: "Wallet address is required" });
      return;
    }

    const nonce = await authService.getNonce(walletAddress);

    res.json({ nonce });
  } catch (error) {
    console.error("Error getting nonce:", error);
    res.status(500).json({ error: "Failed to get nonce" });
  }
};

/**
 * Verify signature and login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      res
        .status(400)
        .json({ error: "Wallet address and signature are required" });
      return;
    }

    const { token, user } = await authService.verifyAndLogin(
      walletAddress,
      signature
    );

    res.json({
      token,
      user: {
        walletAddress: user.walletAddress,
        username: user.username,
        profilePicture: user.profilePicture,
        bio: user.bio,
        email: user.email,
        socialLinks: user.socialLinks,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({ error: error.message || "Login failed" });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await authService.getUserByWallet(req.user.walletAddress);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      walletAddress: user.walletAddress,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio,
      email: user.email,
      socialLinks: user.socialLinks,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const updates = req.body;

    // Validate username if provided
    if (updates.username && updates.username.length < 3) {
      res
        .status(400)
        .json({ error: "Username must be at least 3 characters long" });
      return;
    }

    const user = await authService.updateProfile(
      req.user.walletAddress,
      updates
    );

    res.json({
      walletAddress: user.walletAddress,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio,
      email: user.email,
      socialLinks: user.socialLinks,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
};

/**
 * Get user profile by wallet address (public)
 */
export const getPublicProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { walletAddress } = req.params;

    const user = await authService.getUserByWallet(walletAddress);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Return only public information
    res.json({
      walletAddress: user.walletAddress,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio,
      socialLinks: user.socialLinks,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error getting public profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

// ============== SIWE (Sign-In With Ethereum) Endpoints ==============

/**
 * Generate a SIWE nonce
 */
export const getSiweNonce = async (req: Request, res: Response): Promise<void> => {
  try {
    const nonce = authService.generateSiweNonce();
    res.json({ nonce });
  } catch (error) {
    console.error("Error generating SIWE nonce:", error);
    res.status(500).json({ error: "Failed to generate nonce" });
  }
};

/**
 * Verify SIWE message and login
 */
export const verifySiweMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      res.status(400).json({ error: "Message and signature are required" });
      return;
    }

    const { token, user } = await authService.verifySiweMessage(message, signature);

    res.json({
      success: true,
      token,
      user: {
        walletAddress: user.walletAddress,
        username: user.username,
        profilePicture: user.profilePicture,
        bio: user.bio,
        email: user.email,
        socialLinks: user.socialLinks,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("SIWE verification error:", error);
    res.status(401).json({ error: error.message || "SIWE verification failed" });
  }
};

/**
 * Get current SIWE session
 */
export const getSiweSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const session = await authService.getSiweSession(token);

    if (!session) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error("Error getting SIWE session:", error);
    res.status(401).json({ error: "Invalid session" });
  }
};

/**
 * Sign out from SIWE session
 */
export const siweSignOut = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a stateless JWT setup, we just return success
    // The client is responsible for deleting the token
    res.json({ success: true });
  } catch (error) {
    console.error("Error signing out:", error);
    res.status(500).json({ error: "Failed to sign out" });
  }
};
