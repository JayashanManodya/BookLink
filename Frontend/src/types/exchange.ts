export type ExchangeRequest = {
  _id: string;
  bookId: string;
  bookTitle: string;
  /** Listing cover (your book when role is received). */
  bookCoverImageUrl?: string;
  requesterClerkUserId: string;
  ownerClerkUserId: string;
  requesterDisplayName: string;
  requesterAvatarUrl?: string;
  ownerDisplayName?: string;
  ownerAvatarUrl?: string;
  message: string;
  offeredBookPhoto?: string;
  meetupHandoffLabel?: string;
  meetupLatitude?: number | null;
  meetupLongitude?: number | null;
  /** ISO string from API when meet-up is scheduled */
  meetupScheduledAt?: string | null;
  meetupContactNumber?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  /** ISO timestamp when the requester confirmed receipt of the book. */
  requesterConfirmedAt?: string | null;
  /** True when a review exists for this exchange (one per swap). */
  hasExchangeReview?: boolean;
  /** Your report id for this exchange, if you filed one. */
  myExchangeReportId?: string | null;
  /** For owner/lister cards: requester already filed a report for this exchange. */
  hasReportFromRequester?: boolean;
  /** Report id when requester filed (so lister can open it). */
  requesterReportId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
