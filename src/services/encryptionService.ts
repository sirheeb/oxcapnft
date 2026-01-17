import * as forge from 'node-forge';
import crypto from 'crypto';

export interface EncryptedDocument {
  encryptedData: Buffer;
  iv: string;
  authTag: string;
  key: string;
}

export class EncryptionService {
  /**
   * Encrypt a document using AES-GCM-256
   * @param buffer Document buffer to encrypt
   * @returns Encrypted document with key, IV, and auth tag
   */
  async encryptDocument(buffer: Buffer): Promise<EncryptedDocument> {
    try {
      // Generate a random 256-bit key for AES-GCM
      const key = crypto.randomBytes(32); // 256 bits
      const iv = crypto.randomBytes(12); // 96 bits for GCM

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      // Encrypt the data
      const encryptedData = Buffer.concat([
        cipher.update(buffer),
        cipher.final(),
      ]);

      // Get the auth tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedData,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        key: key.toString('hex'),
      };
    } catch (error) {
      console.error('Error encrypting document:', error);
      throw new Error('Failed to encrypt document');
    }
  }

  /**
   * Decrypt a document using AES-GCM-256
   * @param encryptedData Encrypted document buffer
   * @param keyHex Encryption key in hex format
   * @param ivHex Initialization vector in hex format
   * @param authTagHex Authentication tag in hex format
   * @returns Decrypted document buffer
   */
  async decryptDocument(
    encryptedData: Buffer,
    keyHex: string,
    ivHex: string,
    authTagHex: string
  ): Promise<Buffer> {
    try {
      const key = Buffer.from(keyHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      const decryptedData = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return decryptedData;
    } catch (error) {
      console.error('Error decrypting document:', error);
      throw new Error('Failed to decrypt document');
    }
  }

  /**
   * Generate access conditions for Lit Protocol
   * @param recipientAddress Ethereum address of recipient
   * @param tokenId Token ID (optional, for NFT-gated access)
   * @returns Access condition array for Lit Protocol
   */
  generateAccessConditions(recipientAddress: string, tokenId?: string): any[] {
    const baseCondition = {
      conditionType: 'evmBasic',
      contractAddress: '',
      standardContractType: '',
      chain: process.env.CHAIN_ID || '11155111',
      method: '',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '=',
        value: recipientAddress.toLowerCase(),
      },
    };

    // For now, simple wallet-based access control
    // Can be enhanced with NFT ownership verification
    return [baseCondition];
  }

  /**
   * Sanitize filename to prevent path traversal attacks
   * @param filename Original filename
   * @returns Sanitized filename
   */
  sanitizeFilename(filename: string): string {
    // Remove any path components
    const basename = filename.replace(/^.*[\\\/]/, '');

    // Remove any non-alphanumeric characters except dots, dashes, and underscores
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length to 255 characters
    return sanitized.substring(0, 255);
  }

  /**
   * Validate file type (only allow PDFs)
   * @param mimetype MIME type of the file
   * @returns true if valid, false otherwise
   */
  validateFileType(mimetype: string): boolean {
    const allowedTypes = ['application/pdf'];
    return allowedTypes.includes(mimetype);
  }

  /**
   * Basic malware scanning (checks for suspicious patterns)
   * @param buffer File buffer
   * @returns true if safe, false if suspicious
   */
  async scanForMalware(buffer: Buffer): Promise<boolean> {
    // Basic checks - in production, integrate with proper antivirus API
    const suspiciousPatterns = [
      Buffer.from('eval('),
      Buffer.from('<script'),
      Buffer.from('javascript:'),
    ];

    for (const pattern of suspiciousPatterns) {
      if (buffer.includes(pattern)) {
        return false;
      }
    }

    return true;
  }
}

export default new EncryptionService();
