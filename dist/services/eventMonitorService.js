"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventMonitorService = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const blockchainService_1 = __importDefault(require("./blockchainService"));
const NFT_1 = __importDefault(require("../models/NFT"));
const Approval_1 = __importDefault(require("../models/Approval"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables before instantiating the service
dotenv_1.default.config();
class EventMonitorService {
    constructor() {
        this.isMonitoring = false;
        const rpcUrl = process.env.RPC_URL;
        const contractAddress = process.env.CONTRACT_ADDRESS;
        if (!rpcUrl || !contractAddress) {
            throw new Error('Missing RPC_URL or CONTRACT_ADDRESS');
        }
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        // Load contract ABI
        const abiPath = path_1.default.join(__dirname, '../../../contracts/artifacts/contracts/DocumentNFT.sol/DocumentNFT.json');
        if (fs_1.default.existsSync(abiPath)) {
            const contractJson = JSON.parse(fs_1.default.readFileSync(abiPath, 'utf-8'));
            this.contract = new ethers_1.ethers.Contract(contractAddress, contractJson.abi, this.provider);
        }
        else {
            console.warn('Contract ABI not found. Event monitoring will be limited.');
            this.contract = new ethers_1.ethers.Contract(contractAddress, [], this.provider);
        }
    }
    /**
     * Start monitoring blockchain events
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('Event monitoring already running');
            return;
        }
        this.isMonitoring = true;
        console.log('🔍 Starting blockchain event monitoring...');
        try {
            // Listen for Transfer events
            this.contract.on('Transfer', async (from, to, tokenId, event) => {
                console.log(`Transfer event: Token ${tokenId} from ${from} to ${to}`);
                await this.handleTransferEvent(from, to, tokenId.toString(), event);
            });
            // Listen for ApprovalForAll events
            this.contract.on('ApprovalForAll', async (owner, operator, approved, event) => {
                console.log(`ApprovalForAll event: ${owner} ${approved ? 'approved' : 'revoked'} ${operator}`);
                await this.handleApprovalForAllEvent(owner, operator, approved, event);
            });
            // Listen for TokenPulledBack events
            this.contract.on('TokenPulledBack', async (from, operator, tokenId, event) => {
                console.log(`TokenPulledBack event: Token ${tokenId} from ${from} by ${operator}`);
                await this.handleTokenPulledBackEvent(from, operator, tokenId.toString(), event);
            });
            // Listen for TokenMinted events
            this.contract.on('TokenMinted', async (to, tokenId, tokenURI, event) => {
                console.log(`TokenMinted event: Token ${tokenId} to ${to}`);
                await this.handleTokenMintedEvent(to, tokenId.toString(), tokenURI, event);
            });
            console.log('✅ Event monitoring started successfully');
        }
        catch (error) {
            console.error('Error starting event monitoring:', error);
            this.isMonitoring = false;
            throw error;
        }
    }
    /**
     * Stop monitoring blockchain events
     */
    async stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        this.contract.removeAllListeners();
        this.isMonitoring = false;
        console.log('Event monitoring stopped');
    }
    /**
     * Handle Transfer events
     */
    async handleTransferEvent(from, to, tokenId, event) {
        try {
            // Update NFT ownership in database
            const nft = await NFT_1.default.findOne({ tokenId });
            if (nft) {
                // Track the transfer
                console.log(`Updating NFT ${tokenId} transfer: ${from} -> ${to}`);
                // If transferred to recipient, mark as redeemed
                if (to.toLowerCase() === nft.recipientAddress.toLowerCase() && nft.status === 'minted') {
                    nft.status = 'redeemed';
                }
            }
        }
        catch (error) {
            console.error('Error handling Transfer event:', error);
        }
    }
    /**
     * Handle ApprovalForAll events
     */
    async handleApprovalForAllEvent(owner, operator, approved, event) {
        try {
            const txHash = event.log.transactionHash;
            const blockNumber = event.log.blockNumber;
            const block = await this.provider.getBlock(blockNumber);
            // Record or update approval in database
            await Approval_1.default.findOneAndUpdate({ walletAddress: owner.toLowerCase(), operatorAddress: operator.toLowerCase() }, {
                walletAddress: owner.toLowerCase(),
                operatorAddress: operator.toLowerCase(),
                isApproved: approved,
                txHash,
                blockNumber,
                timestamp: new Date(block.timestamp * 1000),
                recordedAt: new Date(),
            }, { upsert: true, new: true });
            console.log(`Approval recorded: ${owner} ${approved ? 'approved' : 'revoked'} ${operator}`);
        }
        catch (error) {
            console.error('Error handling ApprovalForAll event:', error);
        }
    }
    /**
     * Handle TokenPulledBack events
     */
    async handleTokenPulledBackEvent(from, operator, tokenId, event) {
        try {
            const txHash = event.log.transactionHash;
            // Update NFT status as pulled
            await NFT_1.default.findOneAndUpdate({ tokenId }, {
                status: 'pulled',
                pullTxHash: txHash,
            });
            console.log(`Token ${tokenId} pulled back from ${from}`);
        }
        catch (error) {
            console.error('Error handling TokenPulledBack event:', error);
        }
    }
    /**
     * Handle TokenMinted events
     */
    async handleTokenMintedEvent(to, tokenId, tokenURI, event) {
        try {
            const txHash = event.log.transactionHash;
            // Update NFT status as minted
            await NFT_1.default.findOneAndUpdate({ tokenId }, {
                status: 'minted',
                mintTxHash: txHash,
            });
            console.log(`Token ${tokenId} minted to ${to}`);
        }
        catch (error) {
            console.error('Error handling TokenMinted event:', error);
        }
    }
    /**
     * Reconcile on-chain and off-chain data
     */
    async reconcileData() {
        console.log('🔄 Starting data reconciliation...');
        try {
            // Get all NFTs from database
            const nfts = await NFT_1.default.find({ status: { $in: ['minted', 'redeemed'] } });
            for (const nft of nfts) {
                try {
                    // Check on-chain owner
                    const owner = await blockchainService_1.default.getTokenOwner(nft.tokenId);
                    // Compare with database
                    if (owner.toLowerCase() !== nft.recipientAddress.toLowerCase()) {
                        console.log(`Discrepancy found for token ${nft.tokenId}: DB=${nft.recipientAddress}, Chain=${owner}`);
                        // Could trigger alert or automatic correction here
                    }
                }
                catch (error) {
                    console.log(`Token ${nft.tokenId} not yet minted on-chain`);
                }
            }
            console.log('✅ Data reconciliation completed');
        }
        catch (error) {
            console.error('Error during data reconciliation:', error);
        }
    }
    /**
     * Get monitoring status
     */
    getStatus() {
        return { isMonitoring: this.isMonitoring };
    }
}
exports.EventMonitorService = EventMonitorService;
exports.default = new EventMonitorService();
