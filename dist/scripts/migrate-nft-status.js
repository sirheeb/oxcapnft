"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const NFT_1 = __importDefault(require("../models/NFT"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
async function migrateNFTStatus() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is required');
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        // Find all NFTs with old status values
        const nftsToUpdate = await NFT_1.default.find({
            status: { $in: ['voucher_created'] }
        });
        console.log(`Found ${nftsToUpdate.length} NFTs with old status values`);
        if (nftsToUpdate.length === 0) {
            console.log('No NFTs need migration');
            return;
        }
        // Update all voucher_created status to uploaded
        const updateResult = await NFT_1.default.updateMany({ status: 'voucher_created' }, { $set: { status: 'uploaded' } });
        console.log(`Successfully updated ${updateResult.modifiedCount} NFTs`);
        console.log('Migration completed successfully!');
        // Verify the migration
        const remainingOldStatus = await NFT_1.default.countDocuments({
            status: { $in: ['voucher_created'] }
        });
        if (remainingOldStatus === 0) {
            console.log('✅ All NFTs have been successfully migrated');
        }
        else {
            console.log(`⚠️  Warning: ${remainingOldStatus} NFTs still have old status values`);
        }
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}
// Run the migration
migrateNFTStatus();
