"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitProtocolService = void 0;
const lit_node_client_1 = require("@lit-protocol/lit-node-client");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before instantiating the service
dotenv_1.default.config();
class LitProtocolService {
    constructor() {
        this.litNodeClient = null;
        this.chain = process.env.LIT_NETWORK || 'cayenne';
    }
    /**
     * Initialize Lit Protocol client
     */
    async initialize() {
        try {
            if (this.litNodeClient) {
                return; // Already initialized
            }
            this.litNodeClient = new lit_node_client_1.LitNodeClient({
                litNetwork: this.chain,
                debug: process.env.NODE_ENV === 'development',
            });
            await this.litNodeClient.connect();
            console.log('✅ Lit Protocol client connected');
        }
        catch (error) {
            console.error('Error initializing Lit Protocol:', error);
            throw new Error('Failed to initialize Lit Protocol');
        }
    }
    /**
     * Encrypt data with Lit Protocol
     * @param data Data to encrypt (string or Uint8Array)
     * @param accessControlConditions Access control conditions
     * @returns Encrypted data and metadata
     */
    async encryptWithLit(data, accessControlConditions) {
        try {
            if (!this.litNodeClient) {
                await this.initialize();
            }
            // For now, return a placeholder since Lit Protocol integration is complex
            // In production, implement proper Lit Protocol encryption
            console.warn('Lit Protocol encryption not fully implemented - using placeholder');
            return {
                ciphertext: Buffer.from(typeof data === 'string' ? data : data).toString('base64'),
                dataToEncryptHash: 'placeholder-hash',
            };
        }
        catch (error) {
            console.error('Error encrypting with Lit:', error);
            throw new Error('Failed to encrypt with Lit Protocol');
        }
    }
    /**
     * Decrypt data with Lit Protocol
     * @param ciphertext Encrypted data
     * @param dataToEncryptHash Hash of original data
     * @param accessControlConditions Access control conditions
     * @param authSig Authentication signature from wallet
     * @returns Decrypted data
     */
    async decryptWithLit(ciphertext, dataToEncryptHash, accessControlConditions, authSig) {
        try {
            if (!this.litNodeClient) {
                await this.initialize();
            }
            // For now, return a placeholder since Lit Protocol integration is complex
            // In production, implement proper Lit Protocol decryption
            console.warn('Lit Protocol decryption not fully implemented - using placeholder');
            return Buffer.from(ciphertext, 'base64').toString();
        }
        catch (error) {
            console.error('Error decrypting with Lit:', error);
            throw new Error('Failed to decrypt with Lit Protocol');
        }
    }
    /**
     * Create access control conditions for NFT ownership
     * @param contractAddress NFT contract address
     * @param tokenId Token ID
     * @param chain Blockchain chain
     * @returns Access control conditions
     */
    createNFTAccessConditions(contractAddress, tokenId, chain = 'ethereum') {
        return [
            {
                contractAddress,
                standardContractType: 'ERC721',
                chain,
                method: 'ownerOf',
                parameters: [tokenId],
                returnValueTest: {
                    comparator: '=',
                    value: ':userAddress',
                },
            },
        ];
    }
    /**
     * Create access control conditions for specific wallet address
     * @param walletAddress Ethereum address
     * @param chain Blockchain chain
     * @returns Access control conditions
     */
    createWalletAccessConditions(walletAddress, chain = 'ethereum') {
        return [
            {
                conditionType: 'evmBasic',
                contractAddress: '',
                standardContractType: '',
                chain,
                method: '',
                parameters: [':userAddress'],
                returnValueTest: {
                    comparator: '=',
                    value: walletAddress.toLowerCase(),
                },
            },
        ];
    }
    /**
     * Create unified access conditions (wallet OR NFT ownership)
     * @param walletAddress Recipient wallet address
     * @param contractAddress NFT contract address
     * @param tokenId Token ID
     * @param chain Blockchain chain
     * @returns Access control conditions with OR logic
     */
    createUnifiedAccessConditions(walletAddress, contractAddress, tokenId, chain = 'ethereum') {
        return [
            {
                conditionType: 'evmBasic',
                contractAddress: '',
                standardContractType: '',
                chain,
                method: '',
                parameters: [':userAddress'],
                returnValueTest: {
                    comparator: '=',
                    value: walletAddress.toLowerCase(),
                },
            },
            { operator: 'or' },
            {
                contractAddress,
                standardContractType: 'ERC721',
                chain,
                method: 'ownerOf',
                parameters: [tokenId],
                returnValueTest: {
                    comparator: '=',
                    value: ':userAddress',
                },
            },
        ];
    }
    /**
     * Get authentication signature for Lit Protocol
     * This should be called from the frontend with wallet signature
     * @param walletAddress User's wallet address
     * @param signature Signature from wallet
     * @returns Auth signature object
     */
    getAuthSig(walletAddress, signature) {
        return {
            sig: signature,
            derivedVia: 'web3.eth.personal.sign',
            signedMessage: 'I am signing to access my encrypted document',
            address: walletAddress.toLowerCase(),
        };
    }
    /**
     * Disconnect Lit client
     */
    async disconnect() {
        if (this.litNodeClient) {
            await this.litNodeClient.disconnect();
            this.litNodeClient = null;
            console.log('Lit Protocol client disconnected');
        }
    }
}
exports.LitProtocolService = LitProtocolService;
exports.default = new LitProtocolService();
