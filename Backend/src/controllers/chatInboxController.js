import { loadUnifiedInboxChats } from '../services/unifiedChatInbox.js';

export async function listChatsInbox(req, res, next) {
  try {
    const { chats } = await loadUnifiedInboxChats(req.clerkUserId);
    return res.json({ chats });
  } catch (err) {
    return next(err);
  }
}
