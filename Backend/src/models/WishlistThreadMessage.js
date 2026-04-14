import mongoose from 'mongoose';

const wishlistThreadMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'WishlistThread', required: true, index: true },
    senderClerkUserId: { type: String, required: true, index: true },
    senderDisplayName: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '', maxlength: 2000 },
    imageUrl: { type: String, trim: true, default: '', maxlength: 2048 },
  },
  { timestamps: true }
);

wishlistThreadMessageSchema.index({ threadId: 1, createdAt: 1 });

export const WishlistThreadMessage = mongoose.model('WishlistThreadMessage', wishlistThreadMessageSchema);
