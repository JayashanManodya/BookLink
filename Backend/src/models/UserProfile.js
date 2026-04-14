import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    profilePhoto: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    area: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export const UserProfile = mongoose.model('UserProfile', userProfileSchema);
