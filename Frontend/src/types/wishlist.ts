export type WishlistItem = {
  _id: string;
  ownerClerkUserId: string;
  ownerDisplayName?: string;
  ownerAvatarUrl?: string;
  title: string;
  author?: string;
  description?: string;
  subject?: string;
  grade?: string;
  language?: string;
  /** Expected publication edition year (optional, wanted posts only) */
  year?: number;
  urgency: 'high' | 'medium' | 'low';
  wantedBookPhoto?: string;
  status?: 'open' | 'fulfilled';
  createdAt?: string;
};
