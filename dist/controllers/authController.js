"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.siweSignOut = exports.getSiweSession = exports.verifySiweMessage = exports.getSiweNonce = exports.getPublicProfile = exports.updateProfile = exports.getProfile = exports.login = exports.getNonce = void 0;
const authService_1 = __importDefault(require("../services/authService"));
/**
 * Get nonce for wallet authentication
 */
const getNonce = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            res.status(400).json({ error: "Wallet address is required" });
            return;
        }
        const nonce = await authService_1.default.getNonce(walletAddress);
        res.json({ nonce });
    }
    catch (error) {
        console.error("Error getting nonce:", error);
        res.status(500).json({ error: "Failed to get nonce" });
    }
};
exports.getNonce = getNonce;
/**
 * Verify signature and login
 */
const login = async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;
        if (!walletAddress || !signature) {
            res
                .status(400)
                .json({ error: "Wallet address and signature are required" });
            return;
        }
        const { token, user } = await authService_1.default.verifyAndLogin(walletAddress, signature);
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
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(401).json({ error: error.message || "Login failed" });
    }
};
exports.login = login;
/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }
        const user = await authService_1.default.getUserByWallet(req.user.walletAddress);
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
    }
    catch (error) {
        console.error("Error getting profile:", error);
        res.status(500).json({ error: "Failed to get profile" });
    }
};
exports.getProfile = getProfile;
/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
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
        const user = await authService_1.default.updateProfile(req.user.walletAddress, updates);
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
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: error.message || "Failed to update profile" });
    }
};
exports.updateProfile = updateProfile;
/**
 * Get user profile by wallet address (public)
 */
const getPublicProfile = async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const user = await authService_1.default.getUserByWallet(walletAddress);
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
    }
    catch (error) {
        console.error("Error getting public profile:", error);
        res.status(500).json({ error: "Failed to get profile" });
    }
};
exports.getPublicProfile = getPublicProfile;
// ============== SIWE (Sign-In With Ethereum) Endpoints ==============
/**
 * Generate a SIWE nonce
 */
const getSiweNonce = async (req, res) => {
    try {
        const nonce = authService_1.default.generateSiweNonce();
        res.json({ nonce });
    }
    catch (error) {
        console.error("Error generating SIWE nonce:", error);
        res.status(500).json({ error: "Failed to generate nonce" });
    }
};
exports.getSiweNonce = getSiweNonce;
/**
 * Verify SIWE message and login
 */
const verifySiweMessage = async (req, res) => {
    try {
        const { message, signature } = req.body;
        if (!message || !signature) {
            res.status(400).json({ error: "Message and signature are required" });
            return;
        }
        const { token, user } = await authService_1.default.verifySiweMessage(message, signature);
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
    }
    catch (error) {
        console.error("SIWE verification error:", error);
        res.status(401).json({ error: error.message || "SIWE verification failed" });
    }
};
exports.verifySiweMessage = verifySiweMessage;
/**
 * Get current SIWE session
 */
const getSiweSession = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({ error: "No token provided" });
            return;
        }
        const session = await authService_1.default.getSiweSession(token);
        if (!session) {
            res.status(401).json({ error: "Invalid session" });
            return;
        }
        res.json(session);
    }
    catch (error) {
        console.error("Error getting SIWE session:", error);
        res.status(401).json({ error: "Invalid session" });
    }
};
exports.getSiweSession = getSiweSession;
/**
 * Sign out from SIWE session
 */
const siweSignOut = async (req, res) => {
    try {
        // In a stateless JWT setup, we just return success
        // The client is responsible for deleting the token
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error signing out:", error);
        res.status(500).json({ error: "Failed to sign out" });
    }
};
exports.siweSignOut = siweSignOut;
