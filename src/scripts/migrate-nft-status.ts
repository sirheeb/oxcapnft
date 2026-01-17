import mongoose from 'mongoose';
import NFT from '../models/NFT';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateNFTStatus() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all NFTs with old status values
    const nftsToUpdate = await NFT.find({
      status: { $in: ['voucher_created'] }
    });

    console.log(`Found ${nftsToUpdate.length} NFTs with old status values`);

    if (nftsToUpdate.length === 0) {
      console.log('No NFTs need migration');
      return;
    }

    // Update all voucher_created status to uploaded
    const updateResult = await NFT.updateMany(
      { status: 'voucher_created' },
      { $set: { status: 'uploaded' } }
    );

    console.log(`Successfully updated ${updateResult.modifiedCount} NFTs`);
    console.log('Migration completed successfully!');

    // Verify the migration
    const remainingOldStatus = await NFT.countDocuments({
      status: { $in: ['voucher_created'] }
    });

    if (remainingOldStatus === 0) {
      console.log('✅ All NFTs have been successfully migrated');
    } else {
      console.log(`⚠️  Warning: ${remainingOldStatus} NFTs still have old status values`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
migrateNFTStatus();