"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureService = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before instantiating the service
dotenv_1.default.config();
class SignatureService {
    constructor() {
        const privateKey = process.env.PRIVATE_KEY;
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const chainId = process.env.CHAIN_ID;
        if (!privateKey || !contractAddress || !chainId) {
            throw new Error('Missing required environment variables for signature service');
        }
        this.wallet = new ethers_1.ethers.Wallet(privateKey);
        this.contractAddress = contractAddress;
        this.chainId = parseInt(chainId);
    }
    /**
     * Get the signer address
     * @returns Ethereum address of the signer
     */
    getSignerAddress() {
        return this.wallet.address;
    }
    /**
     * Verify a message signature
     * @param message Original message
     * @param signature Signature to verify
     * @param expectedAddress Expected signer address
     * @returns true if signature matches expected address
     */
    async verifyMessage(message, signature, expectedAddress) {
        try {
            const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        }
        catch (error) {
            console.error('Error verifying message:', error);
            return false;
        }
    }
    /**
     * Generate a unique nonce for a recipient
     * @param recipient Recipient address
     * @returns Nonce value
     */
    generateNonce(recipient) {
        // In production, this should query the database for the last used nonce
        // For now, we'll use timestamp + random value
        return Date.now() + Math.floor(Math.random() * 1000);
    }
}
exports.SignatureService = SignatureService;
exports.default = new SignatureService();
