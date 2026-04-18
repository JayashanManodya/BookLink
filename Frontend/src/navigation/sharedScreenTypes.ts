export type UserReviewsParams = { clerkUserId: string; displayName?: string };

/** Create or edit an exchange issue report (photo evidence required on create). */
export type ReportExchangeParams = { exchangeRequestId: string; bookTitle: string; reportId?: string };
