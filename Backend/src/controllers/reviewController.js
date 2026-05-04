import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { ExchangeReport } from '../models/ExchangeReport.js';
import { listerFullDisplayNameFromClerk } from '../utils/listerDisplayName.js';

const REVIEW_COMMENT_MIN_LENGTH = 10;
const REVIEW_COMMENT_MAX_LENGTH = 4000;

/** Coerce `exchangeRequestId` from plain string or extended JSON `{ $oid }`. */
function normalizeExchangeRequestIdInput(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid.trim();
  return '';
}

/** Coerce review document id from body (strings or `{ $oid }`). */
function normalizeReviewIdInput(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null && typeof raw.$oid === 'string') return raw.$oid.trim();
  return '';
}

/** Which review to update (`POST /api/reviews`), first valid id wins. */
function resolveUpdateReviewId(body) {
  const b = body ?? {};
  for (const key of ['updateReviewId', 'reviewId']) {
    const s = normalizeReviewIdInput(b[key]);
    if (s && mongoose.isValidObjectId(s)) return s;
  }
  return '';
}

async function displayNameFor(clerkUserId) {
  return (await listerFullDisplayNameFromClerk(clerkUserId)) || 'Reader';
}

async function namesForIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(unique.map(async (id) => [id, await displayNameFor(id)]));
  return Object.fromEntries(entries);
}

function serializeReview(doc, nameById = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    reviewerClerkUserId: o.reviewerClerkUserId,
    revieweeClerkUserId: o.revieweeClerkUserId,
    reviewerDisplayName: nameById[o.reviewerClerkUserId] || 'Reader',
    revieweeDisplayName: nameById[o.revieweeClerkUserId] || 'Reader',
    exchangeRequestId: String(o.exchangeRequestId),
    rating: o.rating,
    comment: o.comment,
    evidencePhoto: o.evidencePhoto,
    flagged: o.flagged,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function applyReviewUpdate(req, res, next, id) {
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const rev = await Review.findById(id);
    if (!rev) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (rev.reviewerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the reviewer can edit this review' });
    }

    const body = req.body ?? {};
    const rv = Number(body.rating);
    const rInt = Number.isFinite(rv) ? Math.round(rv) : NaN;
    if (!Number.isFinite(rInt) || rInt < 1 || rInt > 5) {
      return res.status(400).json({ error: 'rating must be an integer from 1 to 5' });
    }

    const commentTrimmed = typeof body.comment === 'string' ? body.comment.trim() : '';
    if (commentTrimmed.length < REVIEW_COMMENT_MIN_LENGTH) {
      return res.status(400).json({
        error: `Comment must be at least ${REVIEW_COMMENT_MIN_LENGTH} characters (${REVIEW_COMMENT_MAX_LENGTH} max)`,
      });
    }
    if (commentTrimmed.length > REVIEW_COMMENT_MAX_LENGTH) {
      return res.status(400).json({ error: `Comment cannot exceed ${REVIEW_COMMENT_MAX_LENGTH} characters` });
    }

    let evidencePhoto = rev.evidencePhoto;
    if (Object.prototype.hasOwnProperty.call(body, 'evidencePhoto')) {
      evidencePhoto =
        typeof body.evidencePhoto === 'string' ? body.evidencePhoto.trim().slice(0, 2048) : '';
    }

    rev.rating = rInt;
    rev.comment = commentTrimmed.slice(0, REVIEW_COMMENT_MAX_LENGTH);
    rev.evidencePhoto = evidencePhoto;
    await rev.save();

    const names = await namesForIds([rev.reviewerClerkUserId, rev.revieweeClerkUserId]);
    return res.json({ review: serializeReview(rev, names) });
  } catch (err) {
    return next(err);
  }
}

export async function submitReview(req, res, next) {
  try {
    const body = req.body ?? {};
    const updateIdResolved = resolveUpdateReviewId(body);
    const sentUpdateHint =
      !!(body && typeof body === 'object' && ('updateReviewId' in body || 'reviewId' in body));

    if (sentUpdateHint) {
      if (!updateIdResolved) {
        return res.status(400).json({ error: 'Invalid review id for update.' });
      }
      return applyReviewUpdate(req, res, next, updateIdResolved);
    }

    const exchangeRequestId = normalizeExchangeRequestIdInput(body.exchangeRequestId);
    const { revieweeClerkUserId, rating, comment, evidencePhoto } = body;
    if (!exchangeRequestId || !mongoose.isValidObjectId(exchangeRequestId)) {
      return res.status(400).json({ error: 'valid exchangeRequestId is required' });
    }
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: 'rating must be an integer from 1 to 5' });
    }
    const ex = await ExchangeRequest.findById(exchangeRequestId).lean();
    if (!ex) {
      return res.status(400).json({ error: 'Exchange request not found' });
    }
    if (ex.status !== 'accepted') {
      return res.status(400).json({ error: 'Exchange must be accepted before leaving a review' });
    }
    if (ex.requesterClerkUserId !== req.clerkUserId && ex.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Not part of this exchange' });
    }
    /** One review per exchange: only the requester (person who receives the listed book) may review the lister. */
    if (ex.requesterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({
        error: 'Only the reader who requested this book can leave a review for this exchange',
      });
    }
    const other = ex.ownerClerkUserId;
    if (typeof revieweeClerkUserId === 'string' && revieweeClerkUserId !== other) {
      return res.status(400).json({ error: 'revieweeClerkUserId must be the lister for this book' });
    }
    const dup = await Review.findOne({ exchangeRequestId }).lean();
    if (dup) {
      return res.status(409).json({ error: 'A review was already submitted for this exchange' });
    }

    const commentTrimmed = typeof comment === 'string' ? comment.trim() : '';
    if (commentTrimmed.length < REVIEW_COMMENT_MIN_LENGTH) {
      return res.status(400).json({
        error: `Comment must be at least ${REVIEW_COMMENT_MIN_LENGTH} characters (${REVIEW_COMMENT_MAX_LENGTH} max)`,
      });
    }
    if (commentTrimmed.length > REVIEW_COMMENT_MAX_LENGTH) {
      return res.status(400).json({ error: `Comment cannot exceed ${REVIEW_COMMENT_MAX_LENGTH} characters` });
    }

    try {
      const rev = await Review.create({
        reviewerClerkUserId: req.clerkUserId,
        revieweeClerkUserId: other,
        exchangeRequestId,
        rating: r,
        comment: commentTrimmed.slice(0, REVIEW_COMMENT_MAX_LENGTH),
        evidencePhoto: typeof evidencePhoto === 'string' ? evidencePhoto.trim() : '',
      });
      const names = await namesForIds([rev.reviewerClerkUserId, rev.revieweeClerkUserId]);
      return res.status(201).json({ review: serializeReview(rev, names) });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({ error: 'A review was already submitted for this exchange' });
      }
      throw e;
    }
  } catch (err) {
    return next(err);
  }
}

export async function getReviewsForUser(req, res, next) {
  try {
    const { clerkUserId } = req.params;
    if (!clerkUserId || typeof clerkUserId !== 'string') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const [agg] = await Review.aggregate([
      { $match: { revieweeClerkUserId: clerkUserId, flagged: { $ne: true } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);
    const averageRating = agg?.count ? Math.round(agg.averageRating * 10) / 10 : null;
    const reviewCount = agg?.count ?? 0;
    const [reportsAgg] = await ExchangeReport.aggregate([
      {
        $lookup: {
          from: 'exchangerequests',
          localField: 'exchangeRequestId',
          foreignField: '_id',
          as: 'exchange',
        },
      },
      { $unwind: '$exchange' },
      { $match: { 'exchange.ownerClerkUserId': clerkUserId } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
    const reportsReceivedCount = reportsAgg?.count ?? 0;
    // Soft penalty to reflect repeated issues without wiping out review value.
    const ratingPenalty = Math.min(2, reportsReceivedCount * 0.2);
    const adjustedRating =
      averageRating == null ? null : Math.max(1, Math.round((averageRating - ratingPenalty) * 10) / 10);
    const rows = await Review.find({ revieweeClerkUserId: clerkUserId, flagged: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const ids = rows.flatMap((x) => [x.reviewerClerkUserId, x.revieweeClerkUserId]);
    const names = await namesForIds(ids);
    const reviews = rows.map((row) => serializeReview(row, names));
    return res.json({ averageRating, adjustedRating, reportsReceivedCount, reviewCount, reviews });
  } catch (err) {
    return next(err);
  }
}

export async function getReviewById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const rev = await Review.findById(id).lean();
    if (!rev) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (rev.reviewerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the reviewer can view this review for editing' });
    }
    const names = await namesForIds([rev.reviewerClerkUserId, rev.revieweeClerkUserId]);
    return res.json({ review: serializeReview(rev, names) });
  } catch (err) {
    return next(err);
  }
}

export async function updateReview(req, res, next) {
  return applyReviewUpdate(req, res, next, req.params.id);
}

export async function getMyGivenReviews(req, res, next) {
  try {
    const rows = await Review.find({ reviewerClerkUserId: req.clerkUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const ids = rows.flatMap((x) => [x.reviewerClerkUserId, x.revieweeClerkUserId]);
    const names = await namesForIds(ids);
    const reviews = rows.map((row) => serializeReview(row, names));
    return res.json({ reviews });
  } catch (err) {
    return next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const rev = await Review.findById(id);
    if (!rev) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (rev.reviewerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the reviewer can delete this review' });
    }
    await rev.deleteOne();
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export async function flagReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const rev = await Review.findById(id);
    if (!rev) {
      return res.status(404).json({ error: 'Not found' });
    }
    rev.flagged = true;
    await rev.save();
    const names = await namesForIds([rev.reviewerClerkUserId, rev.revieweeClerkUserId]);
    return res.json({ review: serializeReview(rev, names) });
  } catch (err) {
    return next(err);
  }
}
