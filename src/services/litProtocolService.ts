import { LitNodeClient } from '@lit-protocol/lit-node-client';
import * as LitJsSdk from '@lit-protocol/lit-node-client';
import dotenv from 'dotenv';

// Load environment variables before instantiating the service
dotenv.config();

export class LitProtocolService {
  private litNodeClient: LitNodeClient | null = null;
  private chain: string;

  constructor() {
    this.chain = process.env.LIT_NETWORK || 'cayenne';
  }

  /**
   * Initialize Lit Protocol client
   */
  async initialize(): Promise<void> {
    try {
      if (this.litNodeClient) {
        return; // Already initialized
      }

      this.litNodeClient = new LitNodeClient({
        litNetwork: this.chain as any,
        debug: process.env.NODE_ENV === 'development',
      });

      await this.litNodeClient.connect();
      console.log('✅ Lit Protocol client connected');
    } catch (error) {
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
  async encryptWithLit(
    data: string | Uint8Array,
    accessControlConditions: any[]
  ): Promise<{
    ciphertext: string;
    dataToEncryptHash: string;
  }> {
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
    } catch (error) {
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
  async decryptWithLit(
    ciphertext: string,
    dataToEncryptHash: string,
    accessControlConditions: any[],
    authSig: any
  ): Promise<string> {
    try {
      if (!this.litNodeClient) {
        await this.initialize();
      }

      // For now, return a placeholder since Lit Protocol integration is complex
      // In production, implement proper Lit Protocol decryption
      console.warn('Lit Protocol decryption not fully implemented - using placeholder');
      
      return Buffer.from(ciphertext, 'base64').toString();
    } catch (error) {
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
  createNFTAccessConditions(
    contractAddress: string,
    tokenId: string,
    chain: string = 'ethereum'
  ): any[] {
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
  createWalletAccessConditions(
    walletAddress: string,
    chain: string = 'ethereum'
  ): any[] {
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
  createUnifiedAccessConditions(
    walletAddress: string,
    contractAddress: string,
    tokenId: string,
    chain: string = 'ethereum'
  ): any[] {
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
  getAuthSig(walletAddress: string, signature: string): any {
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
  async disconnect(): Promise<void> {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect();
      this.litNodeClient = null;
      console.log('Lit Protocol client disconnected');
    }
  }
}

export default new LitProtocolService();
