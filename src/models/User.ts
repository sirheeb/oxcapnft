import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  walletAddress: string;
  username: string;
  profilePicture: string;
  bio?: string;
  email?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
  };
  nonce: string; // Random nonce for signature verification
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    username: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 30,
      trim: true,
    },
    profilePicture: {
      type: String,
      required: true,
      default: "avatar1", // Default avatar identifier
    },
    bio: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    socialLinks: {
      twitter: {
        type: String,
        trim: true,
      },
      telegram: {
        type: String,
        trim: true,
      },
      discord: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
    },
    nonce: {
      type: String,
      required: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for username searches
UserSchema.index({ username: 1 });

// Method to generate new nonce
UserSchema.methods.generateNonce = function () {
  this.nonce = Math.floor(Math.random() * 1000000).toString();
  return this.nonce;
};

export default mongoose.model<IUser>("User", UserSchema);
