"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticate = void 0;
const authService_1 = __importDefault(require("../services/authService"));
/**
 * Authentication middleware to verify JWT tokens
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "No token provided" });
            return;
        }
        const token = authHeader.split(" ")[1];
        try {
            const decoded = authService_1.default.verifyToken(token);
            req.user = {
                walletAddress: decoded.walletAddress,
                userId: decoded.userId,
            };
            next();
        }
        catch (error) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }
    }
    catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ error: "Authentication failed" });
        return;
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication - sets user if token is valid but doesn't fail if missing
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = authService_1.default.verifyToken(token);
                req.user = {
                    walletAddress: decoded.walletAddress,
                    userId: decoded.userId,
                };
            }
            catch (error) {
                // Token invalid, but we continue without user
            }
        }
        next();
    }
    catch (error) {
        console.error("Optional authentication error:", error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
