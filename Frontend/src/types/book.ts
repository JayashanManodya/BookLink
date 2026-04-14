import type { BookType } from '../constants/bookTypes';

export type Book = {
  _id: string;
  title: string;
  author: string;
  description?: string;
  location?: string;
  language?: string;
  coverImageUrl?: string;
  ownerClerkUserId?: string;
  ownerDisplayName?: string;
  /** From API (Clerk); not stored on Book document. */
  ownerAvatarUrl?: string;
  bookType?: BookType | string;
  collectionPointId?: string;
  handoffPointLabel?: string;
  handoffLatitude?: number;
  handoffLongitude?: number;
  condition?: string;
  year?: number;
  listingStatus?: 'available' | 'exchanged';
  createdAt?: string;
  updatedAt?: string;
};
