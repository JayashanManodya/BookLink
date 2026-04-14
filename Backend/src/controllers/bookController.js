import mongoose from 'mongoose';
import { clerkClient } from '@clerk/express';
import { BOOK_TYPES } from '../constants/bookTypes.js';
import { Book } from '../models/Book.js';

const CONDITION_TYPES = ['new', 'good', 'poor'];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCondition(value) {
  if (typeof value !== 'string') return 'good';
  const normalized = value.toLowerCase().trim();
  if (normalized === 'fair') return 'poor';
  return CONDITION_TYPES.includes(normalized) ? normalized : 'good';
}

/** Meet-up is agreed in accepted-request chat, not on public listings. */
function stripPublicBookFields(book) {
  if (!book) return book;
  const { collectionPointId, handoffPointLabel, handoffLatitude, handoffLongitude, ...rest } = book;
  return rest;
}

async function ownerDisplayNameFor(clerkUserId) {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const first = user.firstName?.trim() || 'Reader';
    const last = user.lastName?.trim();
    return last ? `${first} ${last.charAt(0)}.` : first;
  } catch {
    return 'Reader';
  }
}

/** Profile image for book detail (Clerk); empty string on failure. */
async function ownerAvatarUrlFor(clerkUserId) {
  if (!clerkUserId || typeof clerkUserId !== 'string') return '';
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    return typeof user.imageUrl === 'string' ? user.imageUrl : '';
  } catch {
    return '';
  }
}

async function ownerAvatarsByClerkId(clerkUserIds) {
  const unique = [...new Set(clerkUserIds.filter((id) => typeof id === 'string' && id.length > 0))];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const url = await ownerAvatarUrlFor(id);
      return [id, url];
    })
  );
  return Object.fromEntries(entries);
}

export async function listBooks(req, res, next) {
  try {
    const q = {};
    q.listingStatus = { $ne: 'exchanged' };

    const bookType = typeof req.query.bookType === 'string' ? req.query.bookType.trim() : '';
    if (bookType && BOOK_TYPES.includes(bookType)) {
      q.bookType = bookType;
    }

    const searchRaw =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : typeof req.query.q === 'string'
          ? req.query.q.trim()
          : '';
    if (searchRaw) {
      const re = new RegExp(escapeRegex(searchRaw), 'i');
      q.$or = [{ title: re }, { author: re }, { description: re }, { location: re }, { bookType: re }, { language: re }];
    }

    const condition =
      typeof req.query.condition === 'string' ? req.query.condition.toLowerCase().trim() : '';
    if (condition === 'poor' || condition === 'fair') {
      q.condition = { $in: ['poor', 'fair'] };
    } else if (['good', 'new'].includes(condition)) {
      q.condition = condition;
    }

    const language = typeof req.query.language === 'string' ? req.query.language.trim() : '';
    if (language) {
      q.language = new RegExp(escapeRegex(language), 'i');
    }

    const yearMin = Number.parseInt(req.query.yearMin, 10);
    const yearMax = Number.parseInt(req.query.yearMax, 10);
    const hasYearMin = Number.isFinite(yearMin);
    const hasYearMax = Number.isFinite(yearMax);
    if (hasYearMin || hasYearMax) {
      q.year = {};
      if (hasYearMin) q.year.$gte = yearMin;
      if (hasYearMax) q.year.$lte = yearMax;
    }

    const books = await Book.find(q).sort({ createdAt: -1 }).limit(80).lean();
    const stripped = books.map((b) => stripPublicBookFields(b));
    const avatarByOwner = await ownerAvatarsByClerkId(stripped.map((b) => b.ownerClerkUserId));
    const enriched = stripped.map((b) => ({
      ...b,
      ownerAvatarUrl: avatarByOwner[b.ownerClerkUserId] || '',
    }));
    return res.json({ books: enriched });
  } catch (err) {
    return next(err);
  }
}

export async function getBookById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid book id' });
    }
    const book = await Book.findById(id).lean();
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const base = stripPublicBookFields(book);
    const ownerAvatarUrl = await ownerAvatarUrlFor(base.ownerClerkUserId);
    return res.json({ book: { ...base, ownerAvatarUrl } });
  } catch (err) {
    return next(err);
  }
}

export async function getMyBooks(req, res, next) {
  try {
    const books = await Book.find({ ownerClerkUserId: req.clerkUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ books: books.map((b) => stripPublicBookFields(b)) });
  } catch (err) {
    return next(err);
  }
}

export async function deleteBook(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid book id' });
    }
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the owner can delete this listing' });
    }
    await book.deleteOne();
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export async function updateBook(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid book id' });
    }

    const { title, author, description, location, language, coverImageUrl, bookType, condition, year } = req.body ?? {};
    if (!title || !author) {
      return res.status(400).json({ error: 'title and author are required' });
    }
    if (!bookType || typeof bookType !== 'string' || !BOOK_TYPES.includes(bookType.trim())) {
      return res.status(400).json({ error: 'valid bookType is required' });
    }
    if (typeof description === 'string' && description.length > 2000) {
      return res.status(400).json({ error: 'description is too long' });
    }
    if (typeof location === 'string' && location.length > 120) {
      return res.status(400).json({ error: 'location is too long' });
    }

    const cond = normalizeCondition(condition);

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the owner can edit this listing' });
    }

    book.title = String(title).trim();
    book.author = String(author).trim();
    book.description = typeof description === 'string' ? description.trim() : '';
    book.location = typeof location === 'string' ? location.trim() : '';
    book.language = typeof language === 'string' ? language.trim() : '';
    if (typeof coverImageUrl === 'string') {
      book.coverImageUrl = coverImageUrl;
    }
    book.bookType = bookType.trim();
    book.condition = cond;
    book.year = typeof year === 'number' && Number.isFinite(year) ? year : undefined;

    await book.save();
    const lean = book.toObject();
    return res.json({ book: stripPublicBookFields(lean) });
  } catch (err) {
    return next(err);
  }
}

export async function createBook(req, res, next) {
  try {
    const { title, author, description, location, language, coverImageUrl, bookType, condition, year } = req.body ?? {};
    if (!title || !author) {
      return res.status(400).json({ error: 'title and author are required' });
    }
    if (!bookType || typeof bookType !== 'string' || !BOOK_TYPES.includes(bookType.trim())) {
      return res.status(400).json({ error: 'valid bookType is required' });
    }
    if (typeof description === 'string' && description.length > 2000) {
      return res.status(400).json({ error: 'description is too long' });
    }
    if (typeof location === 'string' && location.length > 120) {
      return res.status(400).json({ error: 'location is too long' });
    }
    const cond = normalizeCondition(condition);
    const ownerDisplayName = await ownerDisplayNameFor(req.clerkUserId);
    const book = await Book.create({
      title,
      author,
      description: typeof description === 'string' ? description.trim() : '',
      location: typeof location === 'string' ? location.trim() : '',
      language: typeof language === 'string' ? language : '',
      coverImageUrl: coverImageUrl ?? '',
      ownerClerkUserId: req.clerkUserId,
      ownerDisplayName,
      bookType: bookType.trim(),
      condition: cond,
      year: typeof year === 'number' && Number.isFinite(year) ? year : undefined,
      listingStatus: 'available',
    });
    const lean = book.toObject();
    return res.status(201).json({ book: stripPublicBookFields(lean) });
  } catch (err) {
    return next(err);
  }
}
