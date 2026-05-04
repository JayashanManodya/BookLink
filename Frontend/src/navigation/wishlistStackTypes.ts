export type WishlistStackParamList = {
  WishlistBoard: { initialTab?: 'community' | 'mine' } | undefined;
  WishlistChats: undefined;
  PostWanted: { editItemId?: string } | undefined;
  WantedBookDetail: { wishlistItemId: string };
  WishlistThreadChat: {
    threadId: string;
    itemTitle: string;
    peerName: string;
    peerAvatarUrl?: string;
    /** When opened from Messages on Exchange tab; hardware/header back goes to Wanted > chats list. */
    returnToChatsInbox?: boolean;
  };
};
