import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
  {
    ownerClerkUserId: { type: String, required: true, index: true },
    ownerDisplayName: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true },
    author: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: '' },
    grade: { type: String, trim: true, default: '' },
    language: { type: String, trim: true, default: '' },
    urgency: { type: String, enum: ['high', 'medium', 'low'], default: 'medium', index: true },
    wantedBookPhoto: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['open', 'fulfilled'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

export const WishlistItem = mongoose.model('WishlistItem', wishlistItemSchema);
