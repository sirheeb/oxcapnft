"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ethers_1 = require("ethers");
const siwe_1 = require("siwe");
const User_1 = __importDefault(require("../models/User"));
class AuthService {
    constructor() {
        // Store nonces temporarily (in production, use Redis or similar)
        this.nonceStore = new Map();
        this.jwtSecret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
        // Clean up expired nonces every 5 minutes
        setInterval(() => this.cleanupNonces(), 5 * 60 * 1000);
    }
    /**
     * Clean up expired nonces (older than 10 minutes)
     */
    cleanupNonces() {
        const now = new Date();
        for (const [key, value] of this.nonceStore.entries()) {
            if (now.getTime() - value.createdAt.getTime() > 10 * 60 * 1000) {
                this.nonceStore.delete(key);
            }
        }
    }
    /**
     * Generate a SIWE nonce
     * @returns Nonce string
     */
    generateSiweNonce() {
        const nonce = (0, siwe_1.generateNonce)();
        // Store nonce with timestamp for validation
        this.nonceStore.set(nonce, { nonce, createdAt: new Date() });
        return nonce;
    }
    /**
     * Verify SIWE message and authenticate user
     * @param message The SIWE message
     * @param signature The signature
     * @returns JWT token and user data
     */
    async verifySiweMessage(message, signature) {
        try {
            // Parse the SIWE message
            const siweMessage = new siwe_1.SiweMessage(message);
            // Verify the nonce exists and hasn't expired
            const storedNonce = this.nonceStore.get(siweMessage.nonce);
            if (!storedNonce) {
                throw new Error("Invalid or expired nonce");
            }
            // Check nonce age (10 minutes max)
            const now = new Date();
            if (now.getTime() - storedNonce.createdAt.getTime() > 10 * 60 * 1000) {
                this.nonceStore.delete(siweMessage.nonce);
                throw new Error("Nonce expired");
            }
            // Verify the message signature
            const verifyResult = await siweMessage.verify({ signature });
            if (!verifyResult.success) {
                throw new Error("Invalid signature");
            }
            // Delete the used nonce
            this.nonceStore.delete(siweMessage.nonce);
            const normalizedAddress = siweMessage.address.toLowerCase();
            // Find or create user
            let user = await User_1.default.findOne({ walletAddress: normalizedAddress });
            if (!user) {
                // Create a new user
                const defaultUsername = `user_${normalizedAddress.slice(2, 8)}`;
                user = new User_1.default({
                    walletAddress: normalizedAddress,
                    username: defaultUsername,
                    nonce: Math.floor(Math.random() * 1000000).toString(),
                    profilePicture: "avatar1",
                });
                await user.save();
            }
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            // Generate JWT token with chain info
            const token = jsonwebtoken_1.default.sign({
                walletAddress: user.walletAddress,
                userId: String(user._id),
                chainId: siweMessage.chainId,
            }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
            return { token, user };
        }
        catch (error) {
            console.error("SIWE verification error:", error);
            throw new Error(error.message || "SIWE verification failed");
        }
    }
    /**
     * Get session info from token
     * @param token JWT token
     * @returns Session info with address and chainId
     */
    async getSiweSession(token) {
        try {
            const decoded = this.verifyToken(token);
            return {
                address: decoded.walletAddress,
                chainId: decoded.chainId || 1,
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Generate a nonce for wallet authentication
     * @param walletAddress The wallet address
     * @returns Nonce string
     */
    async getNonce(walletAddress) {
        const normalizedAddress = walletAddress.toLowerCase();
        let user = await User_1.default.findOne({ walletAddress: normalizedAddress });
        if (!user) {
            // Create a new user with a default username
            const nonce = Math.floor(Math.random() * 1000000).toString();
            const defaultUsername = `user_${normalizedAddress.slice(2, 8)}`;
            user = new User_1.default({
                walletAddress: normalizedAddress,
                username: defaultUsername,
                nonce,
                profilePicture: "avatar1",
            });
            await user.save();
        }
        else {
            // Generate a new nonce
            user.nonce = Math.floor(Math.random() * 1000000).toString();
            await user.save();
        }
        return user.nonce;
    }
    /**
     * Verify signature and generate JWT token
     * @param walletAddress The wallet address
     * @param signature The signature to verify
     * @returns JWT token and user data
     */
    async verifyAndLogin(walletAddress, signature) {
        const normalizedAddress = walletAddress.toLowerCase();
        const user = await User_1.default.findOne({ walletAddress: normalizedAddress });
        if (!user) {
            throw new Error("User not found. Please request a nonce first.");
        }
        // Construct the message that was signed
        const message = `Sign this message to authenticate with Document NFT Marketplace.\n\nNonce: ${user.nonce}`;
        // Verify the signature
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== normalizedAddress) {
            throw new Error("Invalid signature");
        }
        // Update last login
        user.lastLogin = new Date();
        // Generate a new nonce for next login
        user.nonce = Math.floor(Math.random() * 1000000).toString();
        await user.save();
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            walletAddress: user.walletAddress,
            userId: String(user._id),
        }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
        return { token, user };
    }
    /**
     * Verify JWT token
     * @param token JWT token
     * @returns Decoded token payload
     */
    verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.jwtSecret);
        }
        catch (error) {
            throw new Error("Invalid or expired token");
        }
    }
    /**
     * Get user by wallet address
     * @param walletAddress The wallet address
     * @returns User document
     */
    async getUserByWallet(walletAddress) {
        return User_1.default.findOne({ walletAddress: walletAddress.toLowerCase() });
    }
    /**
     * Update user profile
     * @param walletAddress The wallet address
     * @param updates Profile updates
     * @returns Updated user
     */
    async updateProfile(walletAddress, updates) {
        const user = await User_1.default.findOne({
            walletAddress: walletAddress.toLowerCase(),
        });
        if (!user) {
            throw new Error("User not found");
        }
        // Validate profile picture size if it's a base64 image
        if (updates.profilePicture && updates.profilePicture.startsWith('data:image')) {
            const base64Size = updates.profilePicture.length;
            const sizeInMB = (base64Size * 0.75) / (1024 * 1024); // Convert base64 to actual size
            if (sizeInMB > 5) {
                throw new Error(`Profile picture is too large (${sizeInMB.toFixed(2)}MB). Maximum size is 5MB.`);
            }
            // Validate it's a valid base64 image
            const validImageFormats = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/gif', 'data:image/webp'];
            const isValidFormat = validImageFormats.some(format => updates.profilePicture.startsWith(format));
            if (!isValidFormat) {
                throw new Error('Invalid image format. Only JPEG, PNG, GIF, and WebP are supported.');
            }
        }
        // Only allow certain fields to be updated
        const allowedUpdates = [
            "username",
            "profilePicture",
            "bio",
            "email",
            "socialLinks",
        ];
        Object.keys(updates).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                user[key] = updates[key];
            }
        });
        await user.save();
        return user;
    }
}
exports.AuthService = AuthService;
exports.default = new AuthService();
