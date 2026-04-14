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
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
};
