import { ethers } from 'ethers';
import dotenv from 'dotenv';
import blockchainService from './blockchainService';
import NFT from '../models/NFT';
import Approval from '../models/Approval';

import path from 'path';
import fs from 'fs';

// Load environment variables before instantiating the service
dotenv.config();

export class EventMonitorService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private isMonitoring: boolean = false;

  constructor() {
    const rpcUrl = process.env.RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !contractAddress) {
      throw new Error('Missing RPC_URL or CONTRACT_ADDRESS');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Load contract ABI
    const abiPath = path.join(__dirname, '../../../contracts/artifacts/contracts/DocumentNFT.sol/DocumentNFT.json');
    if (fs.existsSync(abiPath)) {
      const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
      this.contract = new ethers.Contract(contractAddress, contractJson.abi, this.provider);
    } else {
      console.warn('Contract ABI not found. Event monitoring will be limited.');
      this.contract = new ethers.Contract(contractAddress, [], this.provider);
    }
  }

  /**
   * Start monitoring blockchain events
   */
  async startMonitoring(): Promise<void> {
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
    } catch (error) {
      console.error('Error starting event monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * Stop monitoring blockchain events
   */
  async stopMonitoring(): Promise<void> {
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
  private async handleTransferEvent(
    from: string,
    to: string,
    tokenId: string,
    event: any
  ): Promise<void> {
    try {
      // Update NFT ownership in database
      const nft = await NFT.findOne({ tokenId });
      if (nft) {
        // Track the transfer
        console.log(`Updating NFT ${tokenId} transfer: ${from} -> ${to}`);

        // If transferred to recipient, mark as redeemed
        if (to.toLowerCase() === nft.recipientAddress.toLowerCase() && nft.status === 'minted') {
          nft.status = 'redeemed';
        }
      }
    } catch (error) {
      console.error('Error handling Transfer event:', error);
    }
  }

  /**
   * Handle ApprovalForAll events
   */
  private async handleApprovalForAllEvent(
    owner: string,
    operator: string,
    approved: boolean,
    event: any
  ): Promise<void> {
    try {
      const txHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;
      const block = await this.provider.getBlock(blockNumber);

      // Record or update approval in database
      await Approval.findOneAndUpdate(
        { walletAddress: owner.toLowerCase(), operatorAddress: operator.toLowerCase() },
        {
          walletAddress: owner.toLowerCase(),
          operatorAddress: operator.toLowerCase(),
          isApproved: approved,
          txHash,
          blockNumber,
          timestamp: new Date(block!.timestamp * 1000),
          recordedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`Approval recorded: ${owner} ${approved ? 'approved' : 'revoked'} ${operator}`);
    } catch (error) {
      console.error('Error handling ApprovalForAll event:', error);
    }
  }



  /**
   * Handle TokenPulledBack events
   */
  private async handleTokenPulledBackEvent(
    from: string,
    operator: string,
    tokenId: string,
    event: any
  ): Promise<void> {
    try {
      const txHash = event.log.transactionHash;

      // Update NFT status as pulled
      await NFT.findOneAndUpdate(
        { tokenId },
        {
          status: 'pulled',
          pullTxHash: txHash,
        }
      );

      console.log(`Token ${tokenId} pulled back from ${from}`);
    } catch (error) {
      console.error('Error handling TokenPulledBack event:', error);
    }
  }

  /**
   * Handle TokenMinted events
   */
  private async handleTokenMintedEvent(
    to: string,
    tokenId: string,
    tokenURI: string,
    event: any
  ): Promise<void> {
    try {
      const txHash = event.log.transactionHash;

      // Update NFT status as minted
      await NFT.findOneAndUpdate(
        { tokenId },
        {
          status: 'minted',
          mintTxHash: txHash,
        }
      );

      console.log(`Token ${tokenId} minted to ${to}`);
    } catch (error) {
      console.error('Error handling TokenMinted event:', error);
    }
  }

  /**
   * Reconcile on-chain and off-chain data
   */
  async reconcileData(): Promise<void> {
    console.log('🔄 Starting data reconciliation...');

    try {
      // Get all NFTs from database
      const nfts = await NFT.find({ status: { $in: ['minted', 'redeemed'] } });

      for (const nft of nfts) {
        try {
          // Check on-chain owner
          const owner = await blockchainService.getTokenOwner(nft.tokenId);

          // Compare with database
          if (owner.toLowerCase() !== nft.recipientAddress.toLowerCase()) {
            console.log(`Discrepancy found for token ${nft.tokenId}: DB=${nft.recipientAddress}, Chain=${owner}`);
            // Could trigger alert or automatic correction here
          }
        } catch (error) {
          console.log(`Token ${nft.tokenId} not yet minted on-chain`);
        }
      }

      console.log('✅ Data reconciliation completed');
    } catch (error) {
      console.error('Error during data reconciliation:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isMonitoring: boolean } {
    return { isMonitoring: this.isMonitoring };
  }
}

export default new EventMonitorService();
