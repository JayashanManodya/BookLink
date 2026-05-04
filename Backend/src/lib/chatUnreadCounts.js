import { ExchangeMessage } from '../models/ExchangeMessage.js';
import { WishlistThreadMessage } from '../models/WishlistThreadMessage.js';

/** Peer messages strictly after lastRead (or all peer messages if never read). */
export async function countUnreadExchangeMessages(me, requestRow) {
  const imOwner = requestRow.ownerClerkUserId === me;
  const lastRead = imOwner ? requestRow.ownerLastReadAt : requestRow.requesterLastReadAt;
  const q = { requestId: requestRow._id, senderClerkUserId: { $ne: me } };
  if (lastRead) q.createdAt = { $gt: lastRead };
  return ExchangeMessage.countDocuments(q);
}

export async function countUnreadWishlistMessages(me, threadRow) {
  const imSeeker = threadRow.seekerClerkUserId === me;
  const lastRead = imSeeker ? threadRow.seekerLastReadAt : threadRow.helperLastReadAt;
  const q = { threadId: threadRow._id, senderClerkUserId: { $ne: me } };
  if (lastRead) q.createdAt = { $gt: lastRead };
  return WishlistThreadMessage.countDocuments(q);
}
