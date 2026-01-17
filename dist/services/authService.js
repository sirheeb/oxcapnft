"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ethers_1 = require("ethers");
const User_1 = __importDefault(require("../models/User"));
class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
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
