import { Book } from '../models/Book.js';
import { WishlistItem } from '../models/WishlistItem.js';
import { PushDeviceToken } from '../models/PushDeviceToken.js';
import { sendExpoPushToTokens } from './sendExpoPushNotifications.js';

function previewBody(text, imageUrl) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (t) return t.length > 140 ? `${t.slice(0, 140)}…` : t;
  if (imageUrl) return 'Sent a photo';
  return 'New message';
}

function stringifyData(obj) {
  /** Expo push `data` values should be strings for reliable delivery. */
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

async function tokensForUser(clerkUserId) {
  const rows = await PushDeviceToken.find({ clerkUserId }).select({ expoPushToken: 1 }).lean();
  return rows.map((r) => r.expoPushToken).filter(Boolean);
}

export async function notifyExchangeChatRecipient({
  recipientClerkUserId,
  senderDisplayName,
  text,
  imageUrl,
  requestId,
  bookId,
}) {
  if (!recipientClerkUserId) return;
  const tokens = await tokensForUser(recipientClerkUserId);
  if (!tokens.length) return;

  let bookTitle = 'Book';
  try {
    if (bookId) {
      const b = await Book.findById(bookId).select({ title: 1 }).lean();
      if (b?.title) bookTitle = String(b.title);
    }
  } catch {
    /* ignore */
  }

  const title = senderDisplayName || 'BookLink';
  const body = previewBody(text, imageUrl);

  await sendExpoPushToTokens(tokens, {
    title,
    body,
    data: stringifyData({
      kind: 'exchange',
      requestId: String(requestId),
      bookTitle,
      peerName: senderDisplayName || 'Reader',
    }),
  });
}

export async function notifyWishlistChatRecipient({
  recipientClerkUserId,
  senderDisplayName,
  text,
  imageUrl,
  threadId,
  wishlistItemId,
}) {
  if (!recipientClerkUserId) return;
  const tokens = await tokensForUser(recipientClerkUserId);
  if (!tokens.length) return;

  let itemTitle = 'Wanted book';
  try {
    if (wishlistItemId) {
      const it = await WishlistItem.findById(wishlistItemId).select({ title: 1 }).lean();
      if (it?.title) itemTitle = String(it.title);
    }
  } catch {
    /* ignore */
  }

  const title = senderDisplayName || 'BookLink';
  const body = previewBody(text, imageUrl);

  await sendExpoPushToTokens(tokens, {
    title,
    body,
    data: stringifyData({
      kind: 'wishlist',
      threadId: String(threadId),
      itemTitle,
      peerName: senderDisplayName || 'Reader',
    }),
  });
}
