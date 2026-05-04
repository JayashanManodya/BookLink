import mongoose from 'mongoose';
import { clerkClient } from '@clerk/express';
import { Book } from '../models/Book.js';
import { CollectionPoint } from '../models/CollectionPoint.js';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { ExchangeMessage } from '../models/ExchangeMessage.js';
import { Review } from '../models/Review.js';
import { ExchangeReport } from '../models/ExchangeReport.js';
import { normalizeChatImageUrl } from '../utils/chatImageUrl.js';
import {
  normalizeMeetupContactNumber,
  parseMeetupAtRequiredFuture,
} from '../utils/meetupValidation.js';
import { notifyExchangeChatRecipient } from '../services/chatMobilePush.js';

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

/** Coerce request body bookId (plain string or extended JSON `$oid`) to a trimmed string. */
function normalizeBookIdInput(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid.trim();
  return '';
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
        return [
          id,
          {
            displayName,
            imageUrl: user.imageUrl || '',
          },
        ];
      } catch {
        return [
          id,
          {
            displayName: 'Reader',
            imageUrl: '',
          },
        ];
      }
    })
  );
  return Object.fromEntries(entries);
}

function serializeRequest(doc, bookLean, profileById = {}, extra = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const requesterProfile = profileById[o.requesterClerkUserId] || {};
  const ownerProfile = profileById[o.ownerClerkUserId] || {};
  return {
    _id: String(o._id),
    bookId: String(o.bookId),
    bookTitle: bookLean?.title ?? '',
    bookCoverImageUrl: bookLean?.coverImageUrl || '',
    requesterClerkUserId: o.requesterClerkUserId,
    ownerClerkUserId: o.ownerClerkUserId,
    requesterDisplayName: requesterProfile.displayName || o.requesterDisplayName || 'Reader',
    requesterAvatarUrl: requesterProfile.imageUrl || '',
    ownerDisplayName: ownerProfile.displayName || bookLean?.ownerDisplayName || 'Reader',
    ownerAvatarUrl: ownerProfile.imageUrl || '',
    message: o.message,
    offeredBookPhoto: o.offeredBookPhoto || '',
    meetupHandoffLabel: o.meetupHandoffLabel || '',
    meetupLatitude: typeof o.meetupLatitude === 'number' ? o.meetupLatitude : null,
    meetupLongitude: typeof o.meetupLongitude === 'number' ? o.meetupLongitude : null,
    meetupScheduledAt: o.meetupScheduledAt ? new Date(o.meetupScheduledAt).toISOString() : null,
    meetupContactNumber: o.meetupContactNumber || '',
    status: o.status,
    requesterConfirmedAt: o.requesterConfirmedAt ? new Date(o.requesterConfirmedAt).toISOString() : null,
    hasExchangeReview: Boolean(extra.hasExchangeReview),
    /** When you're the reviewer (reader), id of your review for this swap — open edit UI. */
    myExchangeReviewId: extra.myExchangeReviewId != null ? String(extra.myExchangeReviewId) : null,
    myExchangeReportId: extra.myExchangeReportId != null ? String(extra.myExchangeReportId) : null,
    /** For lister view: requester filed a report for this accepted swap. */
    hasReportFromRequester: Boolean(extra.hasReportFromRequester),
    /** Report document id (for lister to open reader's report). */
    requesterReportId: extra.requesterReportId != null ? String(extra.requesterReportId) : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function serializeMessage(doc, profileById = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const senderProfile = profileById[o.senderClerkUserId] || {};
  return {
    _id: String(o._id),
    requestId: String(o.requestId),
    senderClerkUserId: o.senderClerkUserId,
    senderDisplayName: senderProfile.displayName || o.senderDisplayName || 'Reader',
    senderAvatarUrl: senderProfile.imageUrl || '',
    text: o.text ?? '',
    imageUrl: o.imageUrl || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function getRequestForParticipant(requestId, me) {
  if (!mongoose.isValidObjectId(requestId)) return { error: 'Invalid id', status: 400 };
  const row = await ExchangeRequest.findById(requestId).lean();
  if (!row) return { error: 'Request not found', status: 404 };
  if (row.ownerClerkUserId !== me && row.requesterClerkUserId !== me) {
    return { error: 'Not allowed to access this request', status: 403 };
  }
  return { row };
}

export async function getExchangeRequestById(req, res, next) {
  try {
    const { id } = req.params;
    const chk = await getRequestForParticipant(id, req.clerkUserId);
    if (chk.error) {
      return res.status(chk.status).json({ error: chk.error });
    }
    const book = await Book.findById(chk.row.bookId).lean();
    const userProfiles = await getPublicProfilesById([chk.row.requesterClerkUserId, chk.row.ownerClerkUserId]);
    const hasExchangeReview = Boolean(
      await Review.exists({ exchangeRequestId: chk.row._id })
    );
    const myReport = await ExchangeReport.findOne({
      exchangeRequestId: chk.row._id,
      reporterClerkUserId: req.clerkUserId,
    })
      .select('_id')
      .lean();
    const requesterReportRow = await ExchangeReport.findOne({
      exchangeRequestId: chk.row._id,
      reporterClerkUserId: chk.row.requesterClerkUserId,
    })
      .select('_id')
      .lean();
    const requesterReportExists = Boolean(requesterReportRow);
    const myExchangeReviewRow = await Review.findOne({
      exchangeRequestId: chk.row._id,
      reviewerClerkUserId: req.clerkUserId,
    })
      .select('_id')
      .lean();
    return res.json({
      request: serializeRequest(chk.row, book, userProfiles, {
        hasExchangeReview,
        myExchangeReviewId: myExchangeReviewRow?._id ?? null,
        myExchangeReportId: myReport?._id ?? null,
        hasReportFromRequester: requesterReportExists,
        requesterReportId: requesterReportRow?._id ?? null,
      }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function listExchangeRequests(req, res, next) {
  try {
    const role = req.query.role === 'sent' ? 'sent' : 'received';
    const me = req.clerkUserId;
    const filter =
      role === 'received' ? { ownerClerkUserId: me } : { requesterClerkUserId: me };
    const rows = await ExchangeRequest.find(filter).sort({ createdAt: -1 }).limit(80).lean();
    const bookIds = [...new Set(rows.map((r) => String(r.bookId)))];
    const books = await Book.find({ _id: { $in: bookIds } }).lean();
    const byId = Object.fromEntries(books.map((b) => [String(b._id), b]));
    const userProfiles = await getPublicProfilesById(
      rows.flatMap((r) => [r.requesterClerkUserId, r.ownerClerkUserId])
    );
    const rowIds = rows.map((r) => r._id);
    const reviewedRows = await Review.find({ exchangeRequestId: { $in: rowIds } })
      .select('exchangeRequestId')
      .lean();
    const reviewedIds = new Set(reviewedRows.map((rev) => String(rev.exchangeRequestId)));
    const myReportRows = await ExchangeReport.find({
      reporterClerkUserId: me,
      exchangeRequestId: { $in: rowIds },
    })
      .select('exchangeRequestId _id')
      .lean();
    const myReportIdByExchangeId = Object.fromEntries(
      myReportRows.map((rep) => [String(rep.exchangeRequestId), String(rep._id)])
    );
    const myReviewRows = await Review.find({
      exchangeRequestId: { $in: rowIds },
      reviewerClerkUserId: me,
    })
      .select('exchangeRequestId _id')
      .lean();
    const myReviewIdByExchangeId = Object.fromEntries(
      myReviewRows.map((rev) => [String(rev.exchangeRequestId), String(rev._id)])
    );
    const requesterReportRows = await ExchangeReport.find({ exchangeRequestId: { $in: rowIds } })
      .select('exchangeRequestId reporterClerkUserId _id')
      .lean();
    const rowById = Object.fromEntries(rows.map((r) => [String(r._id), r]));
    const requesterReportExchangeIds = new Set();
    const requesterReportIdByExchangeId = {};
    for (const rep of requesterReportRows) {
      const ex = rowById[String(rep.exchangeRequestId)];
      if (ex && rep.reporterClerkUserId === ex.requesterClerkUserId) {
        requesterReportExchangeIds.add(String(rep.exchangeRequestId));
        requesterReportIdByExchangeId[String(rep.exchangeRequestId)] = String(rep._id);
      }
    }
    const requests = rows.map((r) =>
      serializeRequest(r, byId[String(r.bookId)], userProfiles, {
        hasExchangeReview: reviewedIds.has(String(r._id)),
        myExchangeReviewId: myReviewIdByExchangeId[String(r._id)] ?? null,
        myExchangeReportId: myReportIdByExchangeId[String(r._id)] ?? null,
        hasReportFromRequester: requesterReportExchangeIds.has(String(r._id)),
        requesterReportId: requesterReportIdByExchangeId[String(r._id)] ?? null,
      })
    );
    return res.json({ requests });
  } catch (err) {
    return next(err);
  }
}

export async function createExchangeRequest(req, res, next) {
  try {
    const body = req.body ?? {};
    const bookId = normalizeBookIdInput(body.bookId);
    const { message, offeredBookPhoto } = body;
    if (!bookId || !mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ error: 'valid bookId is required' });
    }
    const book = await Book.findById(bookId).lean();
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book.listingStatus === 'exchanged') {
      return res.status(400).json({ error: 'This listing is no longer available' });
    }
    if (book.ownerClerkUserId === req.clerkUserId) {
      return res.status(400).json({ error: 'You cannot request your own listing' });
    }
    const existingAccepted = await ExchangeRequest.findOne({ bookId, status: 'accepted' }).lean();
    if (existingAccepted) {
      return res.status(400).json({ error: 'This listing already has an accepted swap with another reader' });
    }
    const dupPendingRow = await ExchangeRequest.findOne({
      bookId,
      requesterClerkUserId: req.clerkUserId,
      status: 'pending',
    });
    const requesterDisplayName = await shortDisplayName(req.clerkUserId);

    if (dupPendingRow) {
      if (typeof message === 'string') {
        dupPendingRow.message = message.slice(0, 2000);
      }
      if (typeof offeredBookPhoto === 'string') {
        dupPendingRow.offeredBookPhoto = offeredBookPhoto.trim().slice(0, 2000);
      }
      dupPendingRow.requesterDisplayName = requesterDisplayName;
      await dupPendingRow.save();
      const full = await ExchangeRequest.findById(dupPendingRow._id).lean();
      const userProfiles = await getPublicProfilesById([full.requesterClerkUserId, full.ownerClerkUserId]);
      /** 200 — idempotent retries / double-send after a partial success avoid “no success flow”. */
      return res.status(200).json({ request: serializeRequest(full, book, userProfiles) });
    }

    const doc = await ExchangeRequest.create({
      bookId,
      requesterClerkUserId: req.clerkUserId,
      ownerClerkUserId: book.ownerClerkUserId,
      requesterDisplayName,
      message: typeof message === 'string' ? message.slice(0, 2000) : '',
      offeredBookPhoto: typeof offeredBookPhoto === 'string' ? offeredBookPhoto.trim().slice(0, 2000) : '',
      status: 'pending',
    });
    const full = await ExchangeRequest.findById(doc._id).lean();
    const userProfiles = await getPublicProfilesById([full.requesterClerkUserId, full.ownerClerkUserId]);
    return res.status(201).json({ request: serializeRequest(full, book, userProfiles) });
  } catch (err) {
    return next(err);
  }
}

export async function updateExchangeRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await ExchangeRequest.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (row.requesterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the requester can edit this request' });
    }
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be edited' });
    }
    const { message, offeredBookPhoto } = req.body ?? {};
    if (typeof message === 'string') {
      row.message = message.slice(0, 2000);
    }
    if (typeof offeredBookPhoto === 'string') {
      row.offeredBookPhoto = offeredBookPhoto.trim().slice(0, 2000);
    } else if (offeredBookPhoto === null) {
      row.offeredBookPhoto = '';
    }
    await row.save();
    const book = await Book.findById(row.bookId).lean();
    const userProfiles = await getPublicProfilesById([row.requesterClerkUserId, row.ownerClerkUserId]);
    return res.json({ request: serializeRequest(row.toObject(), book, userProfiles) });
  } catch (err) {
    return next(err);
  }
}

export async function updateExchangeRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body ?? {};
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await ExchangeRequest.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (status === 'cancelled') {
      if (row.requesterClerkUserId !== req.clerkUserId) {
        return res.status(403).json({ error: 'Only the requester can cancel this request' });
      }
      if (row.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      }
      row.status = 'cancelled';
      await row.save();
      const book = await Book.findById(row.bookId).lean();
      const userProfiles = await getPublicProfilesById([row.requesterClerkUserId, row.ownerClerkUserId]);
      return res.json({ request: serializeRequest(row.toObject(), book, userProfiles) });
    }

    if (status !== 'accepted' && status !== 'rejected') {
      return res.status(400).json({ error: 'status must be accepted, rejected, or cancelled' });
    }
    if (row.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the listing owner can update this request' });
    }
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }
    if (status === 'accepted') {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const otherAccepted = await ExchangeRequest.findOne({
            bookId: row.bookId,
            status: 'accepted',
            _id: { $ne: row._id },
          })
            .session(session)
            .lean();
          if (otherAccepted) {
            const err = new Error('This book already has an accepted swap');
            err.statusCode = 400;
            throw err;
          }
          await ExchangeRequest.updateMany(
            { bookId: row.bookId, _id: { $ne: row._id }, status: 'pending' },
            { $set: { status: 'rejected' } },
            { session }
          );
          row.status = 'accepted';
          await row.save({ session });
          await Book.updateOne({ _id: row.bookId }, { $set: { listingStatus: 'exchanged' } }, { session });
        });
      } catch (e) {
        if (e && typeof e.statusCode === 'number' && e.statusCode === 400) {
          return res.status(400).json({ error: e.message });
        }
        return next(e);
      } finally {
        session.endSession();
      }
    } else {
      row.status = status;
      await row.save();
    }
    const book = await Book.findById(row.bookId).lean();
    const userProfiles = await getPublicProfilesById([row.requesterClerkUserId, row.ownerClerkUserId]);
    return res.json({ request: serializeRequest(row.toObject(), book, userProfiles) });
  } catch (err) {
    return next(err);
  }
}

export async function setExchangeRequestMeetup(req, res, next) {
  try {
    const { id } = req.params;
    const { collectionPointId, meetupAt, meetupContactNumber } = req.body ?? {};
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    if (!collectionPointId || !mongoose.isValidObjectId(String(collectionPointId))) {
      return res.status(400).json({ error: 'valid collectionPointId is required' });
    }
    const when = parseMeetupAtRequiredFuture(meetupAt);
    if (!when.ok) {
      return res.status(400).json({ error: when.error });
    }
    const phone = normalizeMeetupContactNumber(meetupContactNumber);
    if (!phone.ok) {
      return res.status(400).json({ error: phone.error });
    }
    const row = await ExchangeRequest.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (row.ownerClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the listing owner can set the meet-up point' });
    }
    if (row.status !== 'accepted') {
      return res.status(400).json({ error: 'Meet-up can only be set after the request is accepted' });
    }
    const point = await CollectionPoint.findById(collectionPointId).lean();
    if (!point) {
      return res.status(400).json({ error: 'Collection point not found' });
    }
    const meetupHandoffLabel = `${point.name} · ${point.city}`;
    row.meetupCollectionPointId = point._id;
    row.meetupHandoffLabel = meetupHandoffLabel;
    row.meetupLatitude = typeof point.latitude === 'number' ? point.latitude : undefined;
    row.meetupLongitude = typeof point.longitude === 'number' ? point.longitude : undefined;
    row.meetupScheduledAt = when.date;
    row.meetupContactNumber = phone.value;
    await row.save();

    const book = await Book.findById(row.bookId).select({ ownerDisplayName: 1 }).lean();
    const senderDisplayName = book?.ownerDisplayName || 'Reader';
    const whenStr = when.date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const text = `Meet-up: ${meetupHandoffLabel}\nWhen: ${whenStr}\nContact: ${phone.value}`;
    await ExchangeMessage.create({
      requestId: id,
      senderClerkUserId: req.clerkUserId,
      senderDisplayName,
      text: text.slice(0, 2000),
      imageUrl: '',
    });

    const full = await ExchangeRequest.findById(id).lean();
    const bookFull = await Book.findById(row.bookId).lean();
    const userProfiles = await getPublicProfilesById([full.requesterClerkUserId, full.ownerClerkUserId]);
    return res.json({ request: serializeRequest(full, bookFull, userProfiles) });
  } catch (err) {
    return next(err);
  }
}

export async function listExchangeMessages(req, res, next) {
  try {
    const { id } = req.params;
    const chk = await getRequestForParticipant(id, req.clerkUserId);
    if (chk.error) {
      return res.status(chk.status).json({ error: chk.error });
    }
    const messages = await ExchangeMessage.find({ requestId: id }).sort({ createdAt: 1 }).limit(400).lean();
    const userProfiles = await getPublicProfilesById(messages.map((m) => m.senderClerkUserId));
    return res.json({ messages: messages.map((m) => serializeMessage(m, userProfiles)) });
  } catch (err) {
    return next(err);
  }
}

export async function createExchangeMessage(req, res, next) {
  try {
    const { id } = req.params;
    const chk = await getRequestForParticipant(id, req.clerkUserId);
    if (chk.error) {
      return res.status(chk.status).json({ error: chk.error });
    }
    const textRaw = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const text = textRaw.slice(0, 2000);
    const imageUrl = normalizeChatImageUrl(req.body?.imageUrl);
    if (!text && !imageUrl) {
      return res.status(400).json({ error: 'text or image is required' });
    }
    let senderDisplayName = 'Reader';
    if (chk.row.requesterClerkUserId === req.clerkUserId) {
      senderDisplayName = chk.row.requesterDisplayName || 'Reader';
    } else if (chk.row.ownerClerkUserId === req.clerkUserId) {
      const book = await Book.findById(chk.row.bookId).select({ ownerDisplayName: 1 }).lean();
      senderDisplayName = book?.ownerDisplayName || 'Reader';
    }

    const msg = await ExchangeMessage.create({
      requestId: id,
      senderClerkUserId: req.clerkUserId,
      senderDisplayName,
      text,
      imageUrl,
    });
    const recipientClerkUserId =
      chk.row.ownerClerkUserId === req.clerkUserId ? chk.row.requesterClerkUserId : chk.row.ownerClerkUserId;
    if (recipientClerkUserId && recipientClerkUserId !== req.clerkUserId) {
      void notifyExchangeChatRecipient({
        recipientClerkUserId,
        senderDisplayName,
        text,
        imageUrl,
        requestId: id,
        bookId: chk.row.bookId,
      }).catch((err) => console.error('[push] exchange chat', err));
    }
    const userProfiles = await getPublicProfilesById([req.clerkUserId]);
    return res.status(201).json({ message: serializeMessage(msg, userProfiles) });
  } catch (err) {
    return next(err);
  }
}

export async function confirmExchangeRequestReceipt(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await ExchangeRequest.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (row.requesterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the requester can confirm receipt' });
    }
    if (row.status !== 'accepted') {
      return res.status(400).json({ error: 'Receipt can only be confirmed after the request is accepted' });
    }
    if (row.requesterConfirmedAt) {
      return res.status(400).json({ error: 'You already confirmed this exchange' });
    }
    const reportBlocksConfirm = await ExchangeReport.exists({
      exchangeRequestId: row._id,
      reporterClerkUserId: row.requesterClerkUserId,
    });
    if (reportBlocksConfirm) {
      return res.status(400).json({
        error: 'You cannot confirm receipt after filing a report for this exchange.',
      });
    }
    row.requesterConfirmedAt = new Date();
    await row.save();

    const book = await Book.findById(row.bookId).lean();
    const userProfiles = await getPublicProfilesById([row.requesterClerkUserId, row.ownerClerkUserId]);
    const hasExchangeReview = Boolean(await Review.exists({ exchangeRequestId: row._id }));
    const myReport = await ExchangeReport.findOne({
      exchangeRequestId: row._id,
      reporterClerkUserId: req.clerkUserId,
    })
      .select('_id')
      .lean();
    const requesterReportRow = await ExchangeReport.findOne({
      exchangeRequestId: row._id,
      reporterClerkUserId: row.requesterClerkUserId,
    })
      .select('_id')
      .lean();
    const myExchangeReviewRow = await Review.findOne({
      exchangeRequestId: row._id,
      reviewerClerkUserId: req.clerkUserId,
    })
      .select('_id')
      .lean();
    return res.json({
      request: serializeRequest(row.toObject(), book, userProfiles, {
        hasExchangeReview,
        myExchangeReviewId: myExchangeReviewRow?._id ?? null,
        myExchangeReportId: myReport?._id ?? null,
        hasReportFromRequester: Boolean(requesterReportRow),
        requesterReportId: requesterReportRow?._id ?? null,
      }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteExchangeRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await ExchangeRequest.findById(id).lean();
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (row.ownerClerkUserId !== req.clerkUserId && row.requesterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Not allowed to delete this request' });
    }
    await ExchangeRequest.deleteOne({ _id: id });
    await ExchangeMessage.deleteMany({ requestId: id });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
