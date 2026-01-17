"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSService = void 0;
const nft_storage_1 = require("nft.storage");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before instantiating the service
dotenv_1.default.config();
class IPFSService {
    constructor() {
        const apiKey = process.env.NFT_STORAGE_API_KEY;
        if (!apiKey) {
            throw new Error('NFT_STORAGE_API_KEY is not set');
        }
        this.client = new nft_storage_1.NFTStorage({ token: apiKey });
    }
    /**
     * Pin a file to IPFS via nft.storage
     * @param buffer File buffer
     * @param filename Original filename
     * @returns IPFS CID
     */
    async pinFile(buffer, filename) {
        try {
            // Create a Blob from the buffer
            const blob = new Blob([buffer]);
            const cid = await this.client.storeBlob(blob);
            console.log(`File pinned to IPFS with CID: ${cid}`);
            return cid;
        }
        catch (error) {
            console.error('Error pinning file to IPFS:', error);
            throw new Error('Failed to pin file to IPFS');
        }
    }
    /**
     * Pin JSON metadata to IPFS
     * @param metadata Metadata object
     * @returns IPFS CID
     */
    async pinJSON(metadata) {
        try {
            const jsonString = JSON.stringify(metadata);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const cid = await this.client.storeBlob(blob);
            console.log(`JSON pinned to IPFS with CID: ${cid}`);
            return cid;
        }
        catch (error) {
            console.error('Error pinning JSON to IPFS:', error);
            throw new Error('Failed to pin JSON to IPFS');
        }
    }
    /**
     * Generate NFT metadata JSON
     * @param tokenId Token ID
     * @param encryptedCID CID of encrypted document
     * @param documentName Document name
     * @param investorAddress Investor wallet address
     * @param accessConditions Lit Protocol access conditions
     * @returns Metadata object
     */
    generateMetadata(tokenId, encryptedCID, documentName, investorAddress, accessConditions) {
        return {
            name: `Confidential Document #${tokenId}`,
            description: `Encrypted document from ${investorAddress}`,
            image: 'ipfs://QmDefaultDocumentImage', // Replace with actual default image CID
            attributes: [
                {
                    trait_type: 'Document Type',
                    value: 'Contract',
                },
                {
                    trait_type: 'Encrypted',
                    value: 'true',
                },
                {
                    trait_type: 'Original Name',
                    value: documentName,
                },
            ],
            encryptedCID,
            encryptionScheme: 'AES-GCM-256',
            accessControl: {
                protocol: 'lit',
                conditions: accessConditions,
            },
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Build IPFS gateway URL from CID
     * @param cid IPFS CID
     * @returns Gateway URL
     */
    getGatewayUrl(cid) {
        return `https://nftstorage.link/ipfs/${cid}`;
    }
    /**
     * Fetch data from IPFS by CID
     * @param cid IPFS CID
     * @returns File buffer
     */
    async fetchFromIPFS(cid) {
        try {
            const url = this.getGatewayUrl(cid);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (error) {
            console.error('Error fetching from IPFS:', error);
            throw new Error('Failed to fetch data from IPFS');
        }
    }
    /**
     * Retry mechanism for IPFS operations
     * @param operation Async operation to retry
     * @param maxRetries Maximum number of retries
     * @param delay Delay between retries in ms
     * @returns Result of the operation
     */
    async retryOperation(operation, maxRetries = 3, delay = 2000) {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                console.log(`Retry attempt ${i + 1}/${maxRetries} failed:`, error);
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error('Operation failed after retries');
    }
}
exports.IPFSService = IPFSService;
exports.default = new IPFSService();
