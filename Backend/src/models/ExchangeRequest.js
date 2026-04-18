import mongoose from 'mongoose';

const exchangeRequestSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    requesterClerkUserId: { type: String, required: true, index: true },
    ownerClerkUserId: { type: String, required: true, index: true },
    requesterDisplayName: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    offeredBookPhoto: { type: String, trim: true, default: '' },
    meetupCollectionPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionPoint',
    },
    meetupHandoffLabel: { type: String, trim: true, default: '' },
    meetupLatitude: { type: Number },
    meetupLongitude: { type: Number },
    meetupScheduledAt: { type: Date },
    meetupContactNumber: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    requesterConfirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exchangeRequestSchema.index({ bookId: 1, requesterClerkUserId: 1, status: 1 });
exchangeRequestSchema.index({ bookId: 1, status: 1 });

export const ExchangeRequest = mongoose.model('ExchangeRequest', exchangeRequestSchema);
