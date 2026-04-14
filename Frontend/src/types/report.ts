export type ReportStatus = 'Open' | 'UnderReview' | 'Resolved' | 'Dismissed' | 'Cancelled';

export type Report = {
  _id: string;
  reporterClerkUserId: string;
  reportedUserClerkId?: string;
  reportedBookId?: string | null;
  reason: string;
  description: string;
  evidencePhoto?: string;
  status: ReportStatus;
  createdAt?: string;
  updatedAt?: string;
  reportedUserDisplayName?: string;
  reportedBookTitle?: string;
};

export const REPORT_REASONS = ['Fake Listing', 'Scammer', 'No Show', 'Bad Condition', 'Other'] as const;
