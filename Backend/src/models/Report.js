import mongoose from 'mongoose';

const REASONS = ['Fake Listing', 'Scammer', 'No Show', 'Bad Condition', 'Other'];

const reportSchema = new mongoose.Schema(
  {
    reporterClerkUserId: { type: String, required: true, index: true },
    reportedUserClerkId: { type: String, trim: true, default: '', index: true },
    reportedBookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null },
    reason: { type: String, required: true, enum: REASONS },
    description: { type: String, required: true, trim: true },
    evidencePhoto: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Open', 'UnderReview', 'Resolved', 'Dismissed', 'Cancelled'],
      default: 'Open',
      index: true,
    },
  },
  { timestamps: true }
);

reportSchema.pre('validate', function preValidate() {
  const hasUser = Boolean(this.reportedUserClerkId?.trim());
  const hasBook = Boolean(this.reportedBookId);
  if (!hasUser && !hasBook) {
    this.invalidate('reportedUserClerkId', 'Either reported user or reported book is required');
  }
});

export const REPORT_REASONS = REASONS;
export const Report = mongoose.model('Report', reportSchema);
