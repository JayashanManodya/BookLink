import mongoose from 'mongoose';

const exchangeReportSchema = new mongoose.Schema(
  {
    exchangeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExchangeRequest',
      required: true,
      index: true,
    },
    reporterClerkUserId: { type: String, required: true, index: true },
    /** What went wrong (condition, no-show, etc.) */
    details: { type: String, trim: true, default: '', maxlength: 4000 },
    /** Required when creating; stored as Cloudinary URL */
    evidencePhoto: { type: String, trim: true, default: '' },
    /** Reserved for future moderation; reporters only see their own rows */
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

exchangeReportSchema.index({ exchangeRequestId: 1, reporterClerkUserId: 1 }, { unique: true });

export const ExchangeReport = mongoose.model('ExchangeReport', exchangeReportSchema);
