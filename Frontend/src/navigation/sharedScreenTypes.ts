export type UserReviewsParams = { clerkUserId: string; displayName?: string };

/** Create or edit an exchange issue report (photo evidence required on create). */
export type ReportExchangeParams = {
  exchangeRequestId: string;
  bookTitle: string;
  reportId?: string;
  /** Lister viewing the reader's report (read-only). */
  listerView?: boolean;
  /** Reader display name (e.g. from request card); API also returns profile. */
  readerName?: string;
  readerAvatarUrl?: string;
};
