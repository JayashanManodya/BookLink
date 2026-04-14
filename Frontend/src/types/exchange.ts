export type ExchangeRequest = {
  _id: string;
  bookId: string;
  bookTitle: string;
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
  createdAt?: string;
  updatedAt?: string;
};
