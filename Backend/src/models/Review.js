import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewerClerkUserId: { type: String, required: true, index: true },
    revieweeClerkUserId: { type: String, required: true, index: true },
    exchangeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExchangeRequest',
      required: true,
      unique: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
    evidencePhoto: { type: String, trim: true, default: '' },
    flagged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Review = mongoose.model('Review', reviewSchema);
