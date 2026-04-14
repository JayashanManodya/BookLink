import mongoose from 'mongoose';

const wishlistThreadSchema = new mongoose.Schema(
  {
    wishlistItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WishlistItem',
      required: true,
      index: true,
    },
    seekerClerkUserId: { type: String, required: true, index: true },
    helperClerkUserId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

wishlistThreadSchema.index({ wishlistItemId: 1, helperClerkUserId: 1 }, { unique: true });

export const WishlistThread = mongoose.model('WishlistThread', wishlistThreadSchema);
