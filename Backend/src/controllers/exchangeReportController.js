import mongoose from 'mongoose';
import { clerkClient } from '@clerk/express';
import { Book } from '../models/Book.js';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { ExchangeReport } from '../models/ExchangeReport.js';

async function displayNameByUserIds(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const user = await clerkClient.users.getUser(id);
        const first = user.firstName?.trim() || 'Reader';
        const last = user.lastName?.trim();
        const name = last ? `${first} ${last.charAt(0)}.` : first;
        return [id, name];
      } catch {
        return [id, 'Reader'];
      }
    })
  );
  return Object.fromEntries(entries);
}

/** Display name + avatar for reporter (chat / lister view). */
async function reporterProfilesByIds(userIds) {
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

function serializeListerReceivedReport(doc, bookTitle, reporterDisplayName) {
  const o = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    exchangeRequestId: String(o.exchangeRequestId),
    reporterClerkUserId: o.reporterClerkUserId,
    reporterDisplayName: reporterDisplayName || 'Reader',
    bookTitle: bookTitle || '',
    details: o.details ?? '',
    evidencePhoto: o.evidencePhoto ?? '',
    status: o.status ?? 'open',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function serializeReport(doc, extra = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const canEdit = typeof extra.canEdit === 'boolean' ? extra.canEdit : true;
  /** @type {'reporter_locked' | 'lister_view' | null} */
  const readOnlyReason =
    extra.readOnlyReason === 'reporter_locked' || extra.readOnlyReason === 'lister_view'
      ? extra.readOnlyReason
      : null;
  const reporterDisplayName =
    typeof extra.reporterDisplayName === 'string' ? extra.reporterDisplayName : undefined;
  const reporterAvatarUrl = typeof extra.reporterAvatarUrl === 'string' ? extra.reporterAvatarUrl : undefined;
  return {
    _id: String(o._id),
    exchangeRequestId: String(o.exchangeRequestId),
    reporterClerkUserId: o.reporterClerkUserId,
    details: o.details ?? '',
    evidencePhoto: o.evidencePhoto ?? '',
    status: o.status ?? 'open',
    bookTitle: typeof extra.bookTitle === 'string' ? extra.bookTitle : '',
    canEdit,
    readOnlyReason,
    ...(reporterDisplayName != null ? { reporterDisplayName } : {}),
    ...(reporterAvatarUrl != null ? { reporterAvatarUrl } : {}),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function canRequesterEditReport(exchangeLean) {
  if (!exchangeLean) return false;
  return !exchangeLean.requesterConfirmedAt;
}

async function assertCreateReport(exchangeRequestId, clerkUserId) {
  if (!mongoose.isValidObjectId(exchangeRequestId)) {
    return { error: 'Invalid exchange request id', status: 400 };
  }
  const row = await ExchangeRequest.findById(exchangeRequestId).lean();
  if (!row) {
    return { error: 'Exchange request not found', status: 404 };
  }
  if (row.requesterClerkUserId !== clerkUserId) {
    return { error: 'Only the reader who requested the book can file this report', status: 403 };
  }
  if (row.status !== 'accepted') {
    return { error: 'Reports are only allowed for accepted exchanges', status: 400 };
  }
  if (row.requesterConfirmedAt) {
    return {
      error:
        'You can only report before confirming receipt. After confirming, you can leave a review instead.',
      status: 400,
    };
  }
  return { row };
}

export async function createExchangeReport(req, res, next) {
  try {
    const { exchangeRequestId, details, evidencePhoto } = req.body ?? {};
    const chk = await assertCreateReport(exchangeRequestId, req.clerkUserId);
    if (chk.error) {
      return res.status(chk.status).json({ error: chk.error });
    }
    const photo = typeof evidencePhoto === 'string' ? evidencePhoto.trim() : '';
    if (!photo) {
      return res.status(400).json({ error: 'evidencePhoto is required (upload an image first)' });
    }
    const text = typeof details === 'string' ? details.trim().slice(0, 4000) : '';
    let doc;
    try {
      doc = await ExchangeReport.create({
        exchangeRequestId: chk.row._id,
        reporterClerkUserId: req.clerkUserId,
        details: text,
        evidencePhoto: photo.slice(0, 2000),
      });
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(400).json({ error: 'You already submitted a report for this exchange' });
      }
      throw e;
    }
    const book = await Book.findById(chk.row.bookId).lean();
    return res.status(201).json({
      report: serializeReport(doc.toObject(), { bookTitle: book?.title ?? '', canEdit: true, readOnlyReason: null }),
    });
  } catch (err) {
    return next(err);
  }
}

/** Reports filed by readers on exchanges where the current user is the lister (book owner). */
export async function listReportsReceivedAsLister(req, res, next) {
  try {
    const me = req.clerkUserId;
    const myExchangeIds = await ExchangeRequest.find({ ownerClerkUserId: me }).distinct('_id');
    if (!myExchangeIds.length) {
      return res.json({ reports: [] });
    }
    const rows = await ExchangeReport.find({ exchangeRequestId: { $in: myExchangeIds } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const exIds = rows.map((r) => r.exchangeRequestId);
    const exchanges = await ExchangeRequest.find({ _id: { $in: exIds } }).lean();
    const byEx = Object.fromEntries(exchanges.map((e) => [String(e._id), e]));
    const bookIds = [...new Set(exchanges.map((e) => String(e.bookId)))];
    const books = await Book.find({ _id: { $in: bookIds } }).lean();
    const byBook = Object.fromEntries(books.map((b) => [String(b._id), b]));
    const reporterIds = rows.map((r) => r.reporterClerkUserId);
    const nameById = await displayNameByUserIds(reporterIds);
    const reports = rows.map((r) => {
      const ex = byEx[String(r.exchangeRequestId)];
      const book = ex ? byBook[String(ex.bookId)] : null;
      const nm = nameById[r.reporterClerkUserId] || 'Reader';
      return serializeListerReceivedReport(r, book?.title ?? '', nm);
    });
    return res.json({ reports });
  } catch (err) {
    return next(err);
  }
}

export async function listMyExchangeReports(req, res, next) {
  try {
    const me = req.clerkUserId;
    const rows = await ExchangeReport.find({ reporterClerkUserId: me }).sort({ createdAt: -1 }).limit(100).lean();
    const exIds = rows.map((r) => r.exchangeRequestId);
    const exchanges = await ExchangeRequest.find({ _id: { $in: exIds } }).lean();
    const byEx = Object.fromEntries(exchanges.map((e) => [String(e._id), e]));
    const bookIds = [...new Set(exchanges.map((e) => String(e.bookId)))];
    const books = await Book.find({ _id: { $in: bookIds } }).lean();
    const byBook = Object.fromEntries(books.map((b) => [String(b._id), b]));
    const reports = rows.map((r) => {
      const ex = byEx[String(r.exchangeRequestId)];
      const book = ex ? byBook[String(ex.bookId)] : null;
      const canEdit = canRequesterEditReport(ex);
      return serializeReport(r, {
        bookTitle: book?.title ?? '',
        canEdit,
        readOnlyReason: canEdit ? null : 'reporter_locked',
      });
    });
    return res.json({ reports });
  } catch (err) {
    return next(err);
  }
}

export async function getExchangeReportById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await ExchangeReport.findById(id).lean();
    if (!row) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const ex = await ExchangeRequest.findById(row.exchangeRequestId).lean();
    if (!ex) {
      return res.status(404).json({ error: 'Exchange request not found' });
    }
    const isReporter = row.reporterClerkUserId === req.clerkUserId;
    const isLister = ex.ownerClerkUserId === req.clerkUserId;
    if (!isReporter && !isLister) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const book = ex ? await Book.findById(ex.bookId).lean() : null;
    let canEdit = false;
    let readOnlyReason = null;
    if (isReporter) {
      canEdit = canRequesterEditReport(ex);
      readOnlyReason = canEdit ? null : 'reporter_locked';
    } else {
      canEdit = false;
      readOnlyReason = 'lister_view';
    }
    const repProf = (await reporterProfilesByIds([row.reporterClerkUserId]))[row.reporterClerkUserId] ?? {
      displayName: 'Reader',
      imageUrl: '',
    };
    return res.json({
      report: serializeReport(row, {
        bookTitle: book?.title ?? '',
        canEdit,
        readOnlyReason,
        reporterDisplayName: repProf.displayName,
        reporterAvatarUrl: repProf.imageUrl,
      }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateExchangeReport(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await ExchangeReport.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (row.reporterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const ex = await ExchangeRequest.findById(row.exchangeRequestId).lean();
    if (!canRequesterEditReport(ex)) {
      return res.status(400).json({
        error: 'This report can no longer be edited after you confirmed receipt.',
      });
    }
    const { details, evidencePhoto } = req.body ?? {};
    if (typeof details === 'string') {
      row.details = details.trim().slice(0, 4000);
    }
    if (typeof evidencePhoto === 'string') {
      const p = evidencePhoto.trim();
      if (!p) {
        return res.status(400).json({ error: 'evidencePhoto cannot be empty; remove the image only by replacing it' });
      }
      row.evidencePhoto = p.slice(0, 2000);
    }
    await row.save();
    const exAfter = await ExchangeRequest.findById(row.exchangeRequestId).lean();
    const book = exAfter ? await Book.findById(exAfter.bookId).lean() : null;
    const canEdit = canRequesterEditReport(exAfter);
    return res.json({
      report: serializeReport(row.toObject(), {
        bookTitle: book?.title ?? '',
        canEdit,
        readOnlyReason: canEdit ? null : 'reporter_locked',
      }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteExchangeReport(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await ExchangeReport.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (row.reporterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const ex = await ExchangeRequest.findById(row.exchangeRequestId).lean();
    if (!canRequesterEditReport(ex)) {
      return res.status(400).json({
        error: 'This report can no longer be deleted after you confirmed receipt.',
      });
    }
    await row.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
