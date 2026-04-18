import mongoose from 'mongoose';
import { clerkClient } from '@clerk/express';
import { Book } from '../models/Book.js';
import { WishlistItem } from '../models/WishlistItem.js';
import { WishlistThread } from '../models/WishlistThread.js';
import { WishlistThreadMessage } from '../models/WishlistThreadMessage.js';
import { normalizeChatImageUrl } from '../utils/chatImageUrl.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function openWishlistFilter() {
  return { $or: [{ status: 'open' }, { status: { $exists: false } }] };
}

async function shortDisplayName(clerkUserId) {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const first = user.firstName?.trim() || 'Reader';
    const last = user.lastName?.trim();
    return last ? `${first} ${last.charAt(0)}.` : first;
  } catch {
    return 'Reader';
  }
}

async function getPublicProfilesById(userIds) {
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

async function getWishlistThreadForParticipant(threadId, me) {
  if (!mongoose.isValidObjectId(threadId)) return { error: 'Invalid id', status: 400 };
  const row = await WishlistThread.findById(threadId).lean();
  if (!row) return { error: 'Thread not found', status: 404 };
  if (row.seekerClerkUserId !== me && row.helperClerkUserId !== me) {
    return { error: 'Not allowed to access this chat', status: 403 };
  }
  return { row };
}

function serializeThreadMessage(doc, profileById = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const senderProfile = profileById[o.senderClerkUserId] || {};
  return {
    _id: String(o._id),
    threadId: String(o.threadId),
    senderClerkUserId: o.senderClerkUserId,
    senderDisplayName: senderProfile.displayName || o.senderDisplayName || 'Reader',
    senderAvatarUrl: senderProfile.imageUrl || '',
    text: o.text ?? '',
    imageUrl: o.imageUrl || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export async function listWishlistItems(req, res, next) {
  try {
    const q = { ...openWishlistFilter() };

    const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : '';
    if (subject) {
      q.subject = new RegExp(escapeRegex(subject), 'i');
    }
    const grade = typeof req.query.grade === 'string' ? req.query.grade.trim() : '';
    if (grade) {
      q.grade = new RegExp(escapeRegex(grade), 'i');
    }
    const urgency = typeof req.query.urgency === 'string' ? req.query.urgency.toLowerCase().trim() : '';
    if (['high', 'medium', 'low'].includes(urgency)) {
      q.urgency = urgency;
    }

    const items = await WishlistItem.find(q).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function listMyWishlistItems(req, res, next) {
  try {
    const items = await WishlistItem.find({ ownerClerkUserId: req.clerkUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function getWishlistMatches(req, res, next) {
  try {
    const items = await WishlistItem.find({
      ownerClerkUserId: req.clerkUserId,
      ...openWishlistFilter(),
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const matches = [];
    for (const w of items) {
      const titlePart = w.title?.trim();
      const or = [];
      if (titlePart) {
        or.push({ title: new RegExp(escapeRegex(titlePart), 'i') });
      }
      const topic = w.subject?.trim();
      if (topic) {
        or.push({ bookType: new RegExp(escapeRegex(topic), 'i') });
      }
      if (or.length === 0) {
        matches.push({ wishlistItem: w, books: [] });
        continue;
      }
      const books = await Book.find({
        listingStatus: { $ne: 'exchanged' },
        $or: or,
      })
        .sort({ createdAt: -1 })
        .limit(25)
        .lean();
      matches.push({ wishlistItem: w, books });
    }
    return res.json({ matches });
  } catch (err) {
    return next(err);
  }
}

export async function createWishlistItem(req, res, next) {
  try {
    const { title, author, description, subject, grade, language, urgency, wantedBookPhoto } = req.body ?? {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    const u = ['high', 'medium', 'low'].includes(urgency) ? urgency : 'medium';
    const ownerDisplayName = await shortDisplayName(req.clerkUserId);
    const item = await WishlistItem.create({
      ownerClerkUserId: req.clerkUserId,
      ownerDisplayName,
      title: title.trim(),
      author: typeof author === 'string' ? author.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      subject: typeof subject === 'string' ? subject.trim() : '',
      grade: typeof grade === 'string' ? grade.trim() : '',
      language: typeof language === 'string' ? language.trim() : '',
      urgency: u,
      wantedBookPhoto: typeof wantedBookPhoto === 'string' ? wantedBookPhoto.trim() : '',
      status: 'open',
    });
    return res.status(201).json({ item });
  } catch (err) {
    return next(err);
  }
}

export async function updateWishlistItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const item = await WishlistItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (item.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const {
      title,
      author,
      subject,
      grade,
      language,
      urgency,
      status,
      wantedBookPhoto,
      description,
    } = req.body ?? {};
    if (typeof title === 'string') {
      const t = title.trim();
      if (!t) {
        return res.status(400).json({ error: 'title cannot be empty' });
      }
      item.title = t;
    }
    if (typeof author === 'string') {
      item.author = author.trim();
    }
    if (typeof subject === 'string') {
      item.subject = subject.trim();
    }
    if (typeof grade === 'string') {
      item.grade = grade.trim();
    }
    if (typeof language === 'string') {
      item.language = language.trim();
    }
    if (['high', 'medium', 'low'].includes(urgency)) {
      item.urgency = urgency;
    }
    if (status === 'open' || status === 'fulfilled') {
      item.status = status;
    }
    if (typeof wantedBookPhoto === 'string') {
      item.wantedBookPhoto = wantedBookPhoto.trim();
    }
    if (typeof description === 'string') {
      item.description = description.trim();
    }
    await item.save();
    return res.json({ item });
  } catch (err) {
    return next(err);
  }
}

export async function deleteWishlistItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const item = await WishlistItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (item.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const threads = await WishlistThread.find({ wishlistItemId: item._id }).select('_id').lean();
    const threadIds = threads.map((t) => t._id);
    if (threadIds.length) {
      await WishlistThreadMessage.deleteMany({ threadId: { $in: threadIds } });
    }
    await WishlistThread.deleteMany({ wishlistItemId: item._id });
    await item.deleteOne();
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export async function listThreadsForWishlistItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const item = await WishlistItem.findById(id).lean();
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (item.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the poster can view help chats' });
    }
    const threads = await WishlistThread.find({ wishlistItemId: item._id }).sort({ updatedAt: -1 }).lean();
    const helperIds = threads.map((t) => t.helperClerkUserId);
    const profiles = await getPublicProfilesById(helperIds);
    return res.json({
      threads: threads.map((t) => ({
        _id: String(t._id),
        wishlistItemId: String(t.wishlistItemId),
        helperClerkUserId: t.helperClerkUserId,
        helperDisplayName: profiles[t.helperClerkUserId]?.displayName || 'Reader',
        helperAvatarUrl: profiles[t.helperClerkUserId]?.imageUrl || '',
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

export async function getWishlistItemById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const item = await WishlistItem.findById(id).lean();
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    const isOwner = item.ownerClerkUserId === req.clerkUserId;
    if (!isOwner && item.status && item.status !== 'open') {
      return res.status(404).json({ error: 'Not found' });
    }
    const profiles = await getPublicProfilesById([item.ownerClerkUserId]);
    const p = profiles[item.ownerClerkUserId] || {};
    return res.json({
      item: {
        ...item,
        _id: String(item._id),
        ownerDisplayName: p.displayName || item.ownerDisplayName || 'Reader',
        ownerAvatarUrl: p.imageUrl || '',
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function startWishlistThread(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const item = await WishlistItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (item.ownerClerkUserId === req.clerkUserId) {
      return res.status(400).json({ error: 'You cannot start a help chat on your own wanted post' });
    }
    if (item.status !== 'open') {
      return res.status(400).json({ error: 'This wanted post is no longer open' });
    }
    let thread = await WishlistThread.findOne({ wishlistItemId: item._id, helperClerkUserId: req.clerkUserId });
    if (!thread) {
      thread = await WishlistThread.create({
        wishlistItemId: item._id,
        seekerClerkUserId: item.ownerClerkUserId,
        helperClerkUserId: req.clerkUserId,
        status: 'open',
      });
    }
    const profiles = await getPublicProfilesById([item.ownerClerkUserId, req.clerkUserId]);
    const itemObj = item.toObject();
    return res.json({
      thread: {
        _id: String(thread._id),
        wishlistItemId: String(thread.wishlistItemId),
        seekerClerkUserId: thread.seekerClerkUserId,
        helperClerkUserId: thread.helperClerkUserId,
      },
      item: {
        ...itemObj,
        _id: String(item._id),
        ownerDisplayName: profiles[item.ownerClerkUserId]?.displayName || item.ownerDisplayName,
        ownerAvatarUrl: profiles[item.ownerClerkUserId]?.imageUrl || '',
      },
    });
  } catch (err) {
    return next(err);
  }
}

function previewFromLastThreadMessage(m) {
  if (!m) return 'No messages yet';
  const t = typeof m.text === 'string' ? m.text.trim() : '';
  if (t) return t.length > 120 ? `${t.slice(0, 120)}…` : t;
  if (m.imageUrl) return 'Photo';
  return 'Message';
}

/** List wishlist help threads for the signed-in user (like exchange request lists). */
export async function listMyWishlistChats(req, res, next) {
  try {
    const me = req.clerkUserId;
    const role = req.query.role === 'helper' ? 'helper' : 'poster';
    const filter = role === 'helper' ? { helperClerkUserId: me } : { seekerClerkUserId: me };

    const threadRows = await WishlistThread.find(filter).sort({ updatedAt: -1 }).limit(100).lean();

    const threadIds = threadRows.map((t) => t._id);
    const lastById = new Map();
    if (threadIds.length) {
      const agg = await WishlistThreadMessage.aggregate([
        { $match: { threadId: { $in: threadIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$threadId', doc: { $first: '$$ROOT' } } },
      ]);
      for (const row of agg) {
        lastById.set(String(row._id), row.doc);
      }
    }

    const itemObjectIds = [...new Set(threadRows.map((t) => t.wishlistItemId).filter(Boolean))];
    const items = itemObjectIds.length ? await WishlistItem.find({ _id: { $in: itemObjectIds } }).lean() : [];
    const itemById = Object.fromEntries((items || []).map((it) => [String(it._id), it]));

    const peerIds = threadRows.map((t) => (role === 'poster' ? t.helperClerkUserId : t.seekerClerkUserId));
    const profiles = await getPublicProfilesById(peerIds);

    const chats = threadRows.map((t) => {
      const peerId = role === 'poster' ? t.helperClerkUserId : t.seekerClerkUserId;
      const it = itemById[String(t.wishlistItemId)];
      const last = lastById.get(String(t._id));
      const prof = profiles[peerId] || {};
      return {
        threadId: String(t._id),
        itemTitle: it?.title || 'Wanted book',
        peerName: prof.displayName || 'Reader',
        peerAvatarUrl: prof.imageUrl || '',
        preview: previewFromLastThreadMessage(last),
        lastAt: last?.createdAt || t.updatedAt,
        lastMessageSenderClerkUserId: last?.senderClerkUserId || null,
      };
    });

    return res.json({ chats });
  } catch (err) {
    return next(err);
  }
}

export async function listWishlistThreadMessages(req, res, next) {
  try {
    const { threadId } = req.params;
    const chk = await getWishlistThreadForParticipant(threadId, req.clerkUserId);
    if (chk.error) {
      return res.status(chk.status).json({ error: chk.error });
    }
    const messages = await WishlistThreadMessage.find({ threadId })
      .sort({ createdAt: 1 })
      .limit(400)
      .lean();
    const userProfiles = await getPublicProfilesById(messages.map((m) => m.senderClerkUserId));
    return res.json({ messages: messages.map((m) => serializeThreadMessage(m, userProfiles)) });
  } catch (err) {
    return next(err);
  }
}

export async function createWishlistThreadMessage(req, res, next) {
  try {
    const { threadId } = req.params;
    const chk = await getWishlistThreadForParticipant(threadId, req.clerkUserId);
    if (chk.error) {
      return res.status(chk.status).json({ error: chk.error });
    }
    const textRaw = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const text = textRaw.slice(0, 2000);
    const imageUrl = normalizeChatImageUrl(req.body?.imageUrl);
    if (!text && !imageUrl) {
      return res.status(400).json({ error: 'text or image is required' });
    }
    const senderDisplayName = await shortDisplayName(req.clerkUserId);
    const msg = await WishlistThreadMessage.create({
      threadId,
      senderClerkUserId: req.clerkUserId,
      senderDisplayName,
      text,
      imageUrl,
    });
    const userProfiles = await getPublicProfilesById([req.clerkUserId]);
    return res.status(201).json({ message: serializeThreadMessage(msg, userProfiles) });
  } catch (err) {
    return next(err);
  }
}
