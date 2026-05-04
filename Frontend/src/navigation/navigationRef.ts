import { createNavigationContainerRef } from '@react-navigation/native';

/** Untyped root ref — nested tab + stack params vary by screen. */
export const navigationRef = createNavigationContainerRef();

export function navigateToChatFromPush(data: Record<string, unknown>) {
  if (!navigationRef.isReady()) return;

  const nav = navigationRef as unknown as {
    navigate: (name: string, params?: Record<string, unknown>) => void;
  };

  const kind = data.kind;

  if (kind === 'exchange' && typeof data.requestId === 'string') {
    nav.navigate('Requests', {
      screen: 'RequestChat',
      params: {
        requestId: data.requestId,
        bookTitle: typeof data.bookTitle === 'string' ? data.bookTitle : 'Book',
        peerName: typeof data.peerName === 'string' ? data.peerName : 'Reader',
        peerAvatarUrl: typeof data.peerAvatarUrl === 'string' ? data.peerAvatarUrl : undefined,
      },
    });
    return;
  }

  if (kind === 'wishlist' && typeof data.threadId === 'string') {
    nav.navigate('Wishlist', {
      screen: 'WishlistThreadChat',
      params: {
        threadId: data.threadId,
        itemTitle: typeof data.itemTitle === 'string' ? data.itemTitle : 'Wanted book',
        peerName: typeof data.peerName === 'string' ? data.peerName : 'Reader',
        peerAvatarUrl: typeof data.peerAvatarUrl === 'string' ? data.peerAvatarUrl : undefined,
      },
    });
  }
}

/** Retry briefly — ref may not be ready on cold start when opening from a notification. */
export function navigateToChatFromPushDeferred(data: Record<string, unknown>) {
  let attempts = 0;
  const maxAttempts = 50;
  const tickMs = 80;

  const tryNav = () => {
    if (navigationRef.isReady()) {
      navigateToChatFromPush(data);
      return;
    }
    attempts += 1;
    if (attempts >= maxAttempts) return;
    setTimeout(tryNav, tickMs);
  };

  tryNav();
}
