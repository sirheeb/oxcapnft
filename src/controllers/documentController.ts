import { Request, Response } from "express";
import fs from "fs";
import encryptionService from "../services/encryptionService";
import ipfsService from "../services/ipfsService";
import signatureService from "../services/signatureService";
import blockchainService from "../services/blockchainService";
import NFT from "../models/NFT";
import { createAuditLog } from "../middleware/auditLog";

/**
 * Upload and process a document
 * POST /api/upload
 */
export const uploadDocument = async (req: Request, res: Response) => {
  let filePath: string | undefined;

  try {
    console.log("Upload request received:", {
      body: req.body,
      file: req.file
        ? { name: req.file.originalname, size: req.file.size }
        : null,
    });

    const { recipientAddress, investorAddress, mintType } = req.body;
    const file = req.file;

    if (!file) {
      console.log("No file uploaded");
      return res.status(400).json({
        success: false,
        error: { message: "No file uploaded" },
      });
    }

    if (!recipientAddress || !investorAddress) {
      console.log("Missing required fields:", {
        recipientAddress,
        investorAddress,
      });
      return res.status(400).json({
        success: false,
        error: { message: "Missing recipientAddress or investorAddress" },
      });
    }

    filePath = file.path;

    // Basic file type validation
    if (file.mimetype !== "application/pdf") {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: { message: "Invalid file type. Only PDF files are allowed" },
      });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    console.log("File read successfully, size:", fileBuffer.length);

    // Generate token ID
    const tokenId = Date.now().toString();

    // Store document as base64 in database for fast access
    const documentBase64 = fileBuffer.toString("base64");
    console.log("Document converted to base64, size:", documentBase64.length);

    // Still upload to IPFS for blockchain compatibility (async, don't wait)
    let documentCID = `temp_${tokenId}`;
    let metadataCID = `temp_meta_${tokenId}`;

    // Upload to IPFS in background (don't block the response)
    ipfsService
      .pinFile(fileBuffer, file.originalname)
      .then((cid) => {
        console.log("Background IPFS upload completed:", cid);
        // Update the NFT record with real CID
        NFT.findOneAndUpdate(
          { tokenId },
          {
            encryptedCID: cid,
            $set: { "documentMetadata.ipfsCID": cid },
          }
        ).catch((err) => console.error("Failed to update IPFS CID:", err));
      })
      .catch((err) => console.error("Background IPFS upload failed:", err));

    // Clean up local file
    fs.unlinkSync(filePath);

    // Create NFT record in database with embedded document
    const nft = await NFT.create({
      tokenId,
      recipientAddress: recipientAddress.toLowerCase(),
      investorAddress: investorAddress.toLowerCase(),
      tokenURI: `local://${tokenId}`, // Use local reference
      encryptedCID: documentCID, // Temporary, will be updated by background process
      metadataCID: metadataCID,
      status: "uploaded",
      documentMetadata: {
        originalFilename: file.originalname,
        fileSize: file.size,
        encryptionScheme: "none",
        accessConditions: {
          type: "public",
          description: "No encryption - public access",
        },
        // Store the actual document data for fast access
        documentData: documentBase64,
        mimeType: file.mimetype,
      },
    });

    console.log("NFT record created with embedded document:", nft._id);

    res.json({
      success: true,
      data: {
        tokenId,
        documentCID,
        metadataCID,
        tokenURI: `local://${tokenId}`,
        nft,
      },
    });
  } catch (error: any) {
    console.error("Error uploading document:", error);

    // Clean up file if exists
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to upload document",
        details: error.stack,
      },
    });
  }
};

/**
 * Mint NFT directly on-chain
 * POST /api/mint-direct
 */
export const mintDirect = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        error: { message: "Missing tokenId" },
      });
    }

    // Get NFT from database
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        success: false,
        error: { message: "NFT not found" },
      });
    }

    // Mint on-chain
    console.log("Minting NFT on-chain...");
    const txHash = await blockchainService.mintDirect(
      nft.recipientAddress,
      nft.tokenURI
    );

    // Update NFT status
    nft.status = "minted";
    nft.mintTxHash = txHash;
    await nft.save();

    // Create audit log
    await createAuditLog(
      "nft_minted",
      nft.investorAddress,
      req,
      {
        tokenId,
        txHash,
        recipient: nft.recipientAddress,
      },
      tokenId,
      txHash
    );

    res.json({
      success: true,
      data: {
        tokenId,
        txHash,
        status: "minted",
        nft,
      },
    });
  } catch (error: any) {
    console.error("Error minting NFT:", error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to mint NFT",
      },
    });
  }
};



/**
 * Get NFT information
 * GET /api/nft/:tokenId
 */
export const getNFT = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        success: false,
        error: { message: "NFT not found" },
      });
    }



    // Try to get on-chain owner (if minted)
    let owner = null;
    if (nft.status === "minted" || nft.status === "redeemed") {
      try {
        owner = await blockchainService.getTokenOwner(tokenId);
      } catch (error) {
        console.log("Token not yet on-chain");
      }
    }

    res.json({
      success: true,
      data: {
        nft,
        owner,
      },
    });
  } catch (error: any) {
    console.error("Error getting NFT:", error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to get NFT",
      },
    });
  }
};
/**
 * Get document by token ID for viewing (from MongoDB)
 * GET /api/document/:tokenId
 */
export const getDocument = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    console.log("Document request for tokenId:", tokenId);

    if (!tokenId) {
      console.log("No tokenId provided");
      return res.status(400).json({
        success: false,
        error: { message: "Token ID is required" },
      });
    }

    // Find NFT by tokenId
    const nft = await NFT.findOne({ tokenId });
    console.log("NFT found:", nft ? "Yes" : "No");
    if (nft) {
      console.log(
        "NFT has documentData:",
        !!nft.documentMetadata?.documentData
      );
      console.log(
        "DocumentData length:",
        nft.documentMetadata?.documentData?.length || 0
      );
    }

    if (!nft) {
      console.log("NFT not found for tokenId:", tokenId);
      return res.status(404).json({
        success: false,
        error: { message: "Document not found" },
      });
    }

    // Check if document data exists
    if (!nft.documentMetadata?.documentData) {
      // Check if this is a mock CID (old NFT without document data)
      if (nft.encryptedCID?.includes("Mock")) {
        return res.status(404).json({
          success: false,
          error: {
            message:
              "This document was created with a mock IPFS CID and needs to be re-uploaded to view the PDF.",
            type: "MOCK_CID",
          },
        });
      }

      return res.status(404).json({
        success: false,
        error: { message: "Document data not available" },
      });
    }

    // Convert base64 back to buffer
    const documentBuffer = Buffer.from(
      nft.documentMetadata.documentData,
      "base64"
    );

    // Set appropriate headers
    res.setHeader(
      "Content-Type",
      nft.documentMetadata.mimeType || "application/pdf"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${nft.documentMetadata.originalFilename}"`
    );
    res.setHeader("Content-Length", documentBuffer.length.toString());
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    // Send the document
    res.send(documentBuffer);
  } catch (error: any) {
    console.error("Error getting document:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get document" },
    });
  }
};
