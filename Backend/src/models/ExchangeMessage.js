import mongoose from 'mongoose';

const exchangeMessageSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRequest', required: true, index: true },
    senderClerkUserId: { type: String, required: true, index: true },
    senderDisplayName: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '', maxlength: 2000 },
    imageUrl: { type: String, trim: true, default: '', maxlength: 2048 },
  },
  { timestamps: true }
);

exchangeMessageSchema.index({ requestId: 1, createdAt: 1 });

export const ExchangeMessage = mongoose.model('ExchangeMessage', exchangeMessageSchema);
