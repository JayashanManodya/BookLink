import type { Review } from '../types/review';

/** Submit a review after an exchange, or edit from Exchange detail / Profile → Reviews I wrote (`editReviewId`). */
export type WriteReviewParams = {
  editReviewId?: string;
  /**
   * When opening edit from "Reviews I gave", pass the row from `/api/reviews/mine` so we do not rely on
   * `GET /api/reviews/:id` (helps older API deployments).
   */
  editPrefillReview?: Review;
  exchangeRequestId?: string;
  revieweeClerkUserId?: string;
  revieweeName?: string;
};

export type UserReviewsParams = {
  clerkUserId: string;
  displayName?: string;
  /** From book detail — shown while summary loads and as fallback */
  avatarUrl?: string;
  /** This listing’s meet-up (DS), not the lister’s profile address */
  listingLocationHint?: string;
};

/** Create or edit an exchange issue report (comment required; photo optional). */
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
