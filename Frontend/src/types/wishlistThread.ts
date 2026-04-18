export type WishlistHelpThread = {
  _id: string;
  wishlistItemId: string;
  helperClerkUserId: string;
  helperDisplayName: string;
  helperAvatarUrl?: string;
  updatedAt?: string;
};

export type WishlistThreadDetail = {
  _id: string;
  wishlistItemId: string;
  seekerClerkUserId: string;
  helperClerkUserId: string;
  seekerDisplayName: string;
  seekerAvatarUrl?: string;
  helperDisplayName: string;
  helperAvatarUrl?: string;
  itemTitle: string;
  status: 'open' | 'closed';
  meetupHandoffLabel?: string;
  meetupLatitude?: number | null;
  meetupLongitude?: number | null;
  meetupScheduledAt?: string | null;
  meetupContactNumber?: string;
  createdAt?: string;
  updatedAt?: string;
};
