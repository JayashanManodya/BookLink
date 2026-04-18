export type WishlistStackParamList = {
  WishlistBoard: { initialTab?: 'community' | 'mine' } | undefined;
  WishlistChats: undefined;
  PostWanted: { editItemId?: string } | undefined;
  WishlistMatches: undefined;
  WantedBookDetail: { wishlistItemId: string };
  WishlistThreadChat: {
    threadId: string;
    itemTitle: string;
    peerName: string;
    peerAvatarUrl?: string;
    /** When opened from unified Chats inbox, stack may be empty — back returns here. */
    returnToChatsInbox?: boolean;
  };
};
