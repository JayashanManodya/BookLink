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
    meetupCollectionPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionPoint',
    },
    meetupHandoffLabel: { type: String, trim: true, default: '' },
    meetupLatitude: { type: Number },
    meetupLongitude: { type: Number },
    meetupScheduledAt: { type: Date },
    meetupContactNumber: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

wishlistThreadSchema.index({ wishlistItemId: 1, helperClerkUserId: 1 }, { unique: true });

export const WishlistThread = mongoose.model('WishlistThread', wishlistThreadSchema);
