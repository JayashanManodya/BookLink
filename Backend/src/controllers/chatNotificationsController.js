import mongoose from 'mongoose';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { WishlistThread } from '../models/WishlistThread.js';
import { loadUnifiedInboxChats } from '../services/unifiedChatInbox.js';

export async function getUnreadChatTotal(req, res, next) {
  try {
    const { totalUnread } = await loadUnifiedInboxChats(req.clerkUserId);
    return res.json({ totalUnread });
  } catch (err) {
    return next(err);
  }
}

export async function listUnreadChatNotifications(req, res, next) {
  try {
    const { chats, totalUnread } = await loadUnifiedInboxChats(req.clerkUserId);
    const unreadOnly = chats.filter((c) => (c.unreadCount || 0) > 0);
    return res.json({ totalUnread, chats: unreadOnly });
  } catch (err) {
    return next(err);
  }
}

export async function markExchangeChatRead(req, res, next) {
  try {
    const me = req.clerkUserId;
    const { requestId } = req.params;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ error: 'Invalid request id' });
    }
    const row = await ExchangeRequest.findById(requestId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.ownerClerkUserId !== me && row.requesterClerkUserId !== me) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const now = new Date();
    if (row.ownerClerkUserId === me) row.ownerLastReadAt = now;
    else row.requesterLastReadAt = now;
    await row.save();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function markWishlistChatRead(req, res, next) {
  try {
    const me = req.clerkUserId;
    const { threadId } = req.params;
    if (!mongoose.isValidObjectId(threadId)) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }
    const row = await WishlistThread.findById(threadId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.seekerClerkUserId !== me && row.helperClerkUserId !== me) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const now = new Date();
    if (row.seekerClerkUserId === me) row.seekerLastReadAt = now;
    else row.helperLastReadAt = now;
    await row.save();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
