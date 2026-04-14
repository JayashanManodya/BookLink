import { clerkClient } from '@clerk/express';
import { Book } from '../models/Book.js';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { ExchangeMessage } from '../models/ExchangeMessage.js';
import { WishlistThread } from '../models/WishlistThread.js';
import { WishlistThreadMessage } from '../models/WishlistThreadMessage.js';
import { WishlistItem } from '../models/WishlistItem.js';

async function shortProfiles(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const user = await clerkClient.users.getUser(id);
        const first = user.firstName?.trim() || 'Reader';
        const last = user.lastName?.trim();
        const displayName = last ? `${first} ${last.charAt(0)}.` : first;
        return [id, { displayName, imageUrl: user.imageUrl || '' }];
      } catch {
        return [id, { displayName: 'Reader', imageUrl: '' }];
      }
    })
  );
  return Object.fromEntries(entries);
}

function previewFromLastMessage(m) {
  if (!m) return 'No messages yet';
  const t = typeof m.text === 'string' ? m.text.trim() : '';
  if (t) return t.length > 120 ? `${t.slice(0, 120)}…` : t;
  if (m.imageUrl) return 'Photo';
  return 'Message';
}

export async function listChatsInbox(req, res, next) {
  try {
    const me = req.clerkUserId;

    const requestRows = await ExchangeRequest.find({
      $or: [{ ownerClerkUserId: me }, { requesterClerkUserId: me }],
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const requestIds = requestRows.map((r) => r._id);
    const lastReqMsgById = new Map();
    if (requestIds.length) {
      const agg = await ExchangeMessage.aggregate([
        { $match: { requestId: { $in: requestIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$requestId', doc: { $first: '$$ROOT' } } },
      ]);
      for (const row of agg) {
        lastReqMsgById.set(String(row._id), row.doc);
      }
    }

    const bookObjectIds = [...new Set(requestRows.map((r) => r.bookId).filter(Boolean))];
    const books = bookObjectIds.length
      ? await Book.find({ _id: { $in: bookObjectIds } }).select({ title: 1 }).lean()
      : [];
    const bookTitleById = Object.fromEntries((books || []).map((b) => [String(b._id), b.title || 'Book']));

    const exchangeChats = requestRows.map((r) => {
      const imOwner = r.ownerClerkUserId === me;
      const peerId = imOwner ? r.requesterClerkUserId : r.ownerClerkUserId;
      const last = lastReqMsgById.get(String(r._id));
      return {
        kind: 'exchange',
        requestId: String(r._id),
        bookTitle: bookTitleById[String(r.bookId)] || 'Book',
        peerClerkUserId: peerId,
        preview: previewFromLastMessage(last),
        lastAt: last?.createdAt || r.updatedAt,
        lastMessageSenderClerkUserId: last?.senderClerkUserId || null,
        status: r.status,
      };
    });

    const threadRows = await WishlistThread.find({
      $or: [{ seekerClerkUserId: me }, { helperClerkUserId: me }],
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const threadIds = threadRows.map((t) => t._id);
    const lastThrMsgById = new Map();
    if (threadIds.length) {
      const agg2 = await WishlistThreadMessage.aggregate([
        { $match: { threadId: { $in: threadIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$threadId', doc: { $first: '$$ROOT' } } },
      ]);
      for (const row of agg2) {
        lastThrMsgById.set(String(row._id), row.doc);
      }
    }

    const itemObjectIds = [...new Set(threadRows.map((t) => t.wishlistItemId).filter(Boolean))];
    const items = itemObjectIds.length ? await WishlistItem.find({ _id: { $in: itemObjectIds } }).lean() : [];
    const itemById = Object.fromEntries((items || []).map((it) => [String(it._id), it]));

    const wishlistChats = threadRows.map((t) => {
      const imSeeker = t.seekerClerkUserId === me;
      const peerId = imSeeker ? t.helperClerkUserId : t.seekerClerkUserId;
      const it = itemById[String(t.wishlistItemId)];
      const last = lastThrMsgById.get(String(t._id));
      return {
        kind: 'wishlist',
        threadId: String(t._id),
        itemTitle: it?.title || 'Wanted book',
        peerClerkUserId: peerId,
        preview: previewFromLastMessage(last),
        lastAt: last?.createdAt || t.updatedAt,
        lastMessageSenderClerkUserId: last?.senderClerkUserId || null,
      };
    });

    const allPeerIds = [
      ...exchangeChats.map((c) => c.peerClerkUserId),
      ...wishlistChats.map((c) => c.peerClerkUserId),
    ];
    const profiles = await shortProfiles(allPeerIds);

    for (const c of exchangeChats) {
      const p = profiles[c.peerClerkUserId] || {};
      c.peerName = p.displayName || 'Reader';
      c.peerAvatarUrl = p.imageUrl || '';
      delete c.peerClerkUserId;
    }
    for (const c of wishlistChats) {
      const p = profiles[c.peerClerkUserId] || {};
      c.peerName = p.displayName || 'Reader';
      c.peerAvatarUrl = p.imageUrl || '';
      delete c.peerClerkUserId;
    }

    const chats = [...exchangeChats, ...wishlistChats].sort((a, b) => {
      const ta = new Date(a.lastAt).getTime();
      const tb = new Date(b.lastAt).getTime();
      return tb - ta;
    });

    return res.json({ chats });
  } catch (err) {
    return next(err);
  }
}
