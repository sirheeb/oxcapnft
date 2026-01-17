import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables before instantiating the service
dotenv.config();

// Minimal DocumentNFT ABI with essential functions
const DOCUMENT_NFT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tokenURI_",
        "type": "string"
      }
    ],
    "name": "mintTo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "holder",
        "type": "address"
      }
    ],
    "name": "checkERC20Status",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "allowance",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "pullBackERC20",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor() {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      throw new Error('Missing required environment variables for blockchain service');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contractAddress = contractAddress;

    // Use embedded ABI instead of loading from file
    this.contract = new ethers.Contract(contractAddress, DOCUMENT_NFT_ABI, this.wallet);
    console.log('BlockchainService initialized with embedded ABI');
  }

  /**
   * Mint an NFT directly on-chain
   * @param recipient Recipient address
   * @param tokenURI Token URI containing metadata
   * @returns Transaction hash
   */
  async mintDirect(recipient: string, tokenURI: string): Promise<string> {
    try {
      console.log(`Minting NFT to ${recipient}...`);
      const tx = await this.contract.mintTo(recipient, tokenURI);
      await tx.wait();
      console.log(`NFT minted successfully. TX: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw new Error('Failed to mint NFT on-chain');
    }
  }

  /**
   * Check if an address has approved the operator for token management
   * @param owner Owner address
   * @param operator Operator address
   * @returns true if approved
   */
  async checkApproval(owner: string, operator: string): Promise<boolean> {
    try {
      const isApproved = await this.contract.isApprovedForAll(owner, operator);
      return isApproved;
    } catch (error) {
      console.error('Error checking approval:', error);
      throw new Error('Failed to check approval status');
    }
  }

  /**
   * Pull back a token from a holder (requires approval)
   * @param from Current token owner
   * @param tokenId Token ID to pull back
   * @returns Transaction hash
   */
  async pullToken(from: string, tokenId: string): Promise<string> {
    try {
      console.log(`Pulling back token ${tokenId} from ${from}...`);

      // First check if approved
      const isApproved = await this.checkApproval(from, this.wallet.address);
      if (!isApproved) {
        throw new Error('Operator not approved to pull token');
      }

      const tx = await this.contract.pullBack(from, tokenId);
      await tx.wait();
      console.log(`Token pulled back successfully. TX: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('Error pulling token:', error);
      throw new Error('Failed to pull token');
    }
  }

  /**
   * Get token owner
   * @param tokenId Token ID
   * @returns Owner address
   */
  async getTokenOwner(tokenId: string): Promise<string> {
    try {
      const owner = await this.contract.ownerOf(tokenId);
      return owner;
    } catch (error) {
      console.error('Error getting token owner:', error);
      throw new Error('Failed to get token owner');
    }
  }

  /**
   * Get token URI
   * @param tokenId Token ID
   * @returns Token URI
   */
  async getTokenURI(tokenId: string): Promise<string> {
    try {
      const uri = await this.contract.tokenURI(tokenId);
      return uri;
    } catch (error) {
      console.error('Error getting token URI:', error);
      throw new Error('Failed to get token URI');
    }
  }



  /**
   * Get transaction receipt
   * @param txHash Transaction hash
   * @returns Transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Wait for transaction confirmation
   * @param txHash Transaction hash
   * @param confirmations Number of confirmations to wait for
   * @returns Transaction receipt
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      return receipt;
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw new Error('Transaction confirmation failed');
    }
  }

  /**
   * Get current block number
   * @returns Block number
   */
  async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Error getting block number:', error);
      throw new Error('Failed to get block number');
    }
  }

  /**
   * Get wallet address
   * @returns Ethereum address of the wallet
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Check ERC-20 token balance and allowance for a holder
   * @param tokenContract Address of the ERC-20 token contract
   * @param holder Address of the token holder
   * @returns Object containing balance and allowance
   */
  async checkERC20Status(
    tokenContract: string,
    holder: string
  ): Promise<{ balance: string; allowance: string }> {
    try {
      const result = await this.contract.checkERC20Status(tokenContract, holder);
      return {
        balance: result.balance.toString(),
        allowance: result.allowance.toString(),
      };
    } catch (error) {
      console.error('Error checking ERC-20 status:', error);
      throw new Error('Failed to check ERC-20 token status');
    }
  }

  /**
   * Pull back ERC-20 tokens from a holder
   * @param tokenContract Address of the ERC-20 token contract (e.g., USDT, USDC)
   * @param from Address to pull tokens from
   * @param amount Amount of tokens to pull back (in token's smallest unit)
   * @returns Transaction hash
   */
  async pullBackERC20(
    tokenContract: string,
    from: string,
    amount: string
  ): Promise<string> {
    try {
      console.log(`Pulling back ${amount} tokens from ${from}...`);

      // Check balance and allowance
      const status = await this.checkERC20Status(tokenContract, from);
      if (BigInt(status.allowance) < BigInt(amount)) {
        throw new Error('Insufficient token allowance for pullback');
      }
      if (BigInt(status.balance) < BigInt(amount)) {
        throw new Error('Insufficient token balance for pullback');
      }

      const tx = await this.contract.pullBackERC20(tokenContract, from, amount);
      await tx.wait();
      console.log(`ERC-20 tokens pulled back successfully. TX: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('Error pulling ERC-20 tokens:', error);
      throw new Error('Failed to pull back ERC-20 tokens');
    }
  }

  /**
   * Get ERC-20 token information (name, symbol, decimals)
   * @param tokenContract Address of the ERC-20 token contract
   * @returns Token information
   */
  async getERC20TokenInfo(tokenContract: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> {
    try {
      // Standard ERC-20 ABI for name, symbol, and decimals
      const erc20Abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ];

      const tokenContractInstance = new ethers.Contract(
        tokenContract,
        erc20Abi,
        this.provider
      );

      const [name, symbol, decimals] = await Promise.all([
        tokenContractInstance.name(),
        tokenContractInstance.symbol(),
        tokenContractInstance.decimals(),
      ]);

      return { name, symbol, decimals: Number(decimals) };
    } catch (error) {
      console.error('Error getting ERC-20 token info:', error);
      throw new Error('Failed to get token information');
    }
  }

  /**
   * Get ERC-20 token balance for a specific address
   * @param tokenContract Address of the ERC-20 token contract
   * @param holder Address to check balance for
   * @returns Token balance in smallest unit
   */
  async getERC20Balance(tokenContract: string, holder: string): Promise<string> {
    try {
      const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
      const tokenContractInstance = new ethers.Contract(
        tokenContract,
        erc20Abi,
        this.provider
      );

      const balance = await tokenContractInstance.balanceOf(holder);
      return balance.toString();
    } catch (error) {
      console.error('Error getting ERC-20 balance:', error);
      throw new Error('Failed to get token balance');
    }
  }

  /**
   * Get ERC-20 token allowance
   * @param tokenContract Address of the ERC-20 token contract
   * @param owner Token owner address
   * @param spender Spender address (typically the DocumentNFT contract)
   * @returns Allowance amount in smallest unit
   */
  async getERC20Allowance(
    tokenContract: string,
    owner: string,
    spender: string
  ): Promise<string> {
    try {
      const erc20Abi = ['function allowance(address,address) view returns (uint256)'];
      const tokenContractInstance = new ethers.Contract(
        tokenContract,
        erc20Abi,
        this.provider
      );

      const allowance = await tokenContractInstance.allowance(owner, spender);
      return allowance.toString();
    } catch (error) {
      console.error('Error getting ERC-20 allowance:', error);
      throw new Error('Failed to get token allowance');
    }
  }
}

export default new BlockchainService();
