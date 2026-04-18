import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { ExchangeReport } from '../models/ExchangeReport.js';

function serializeReport(doc, extra = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    exchangeRequestId: String(o.exchangeRequestId),
    reporterClerkUserId: o.reporterClerkUserId,
    details: o.details ?? '',
    evidencePhoto: o.evidencePhoto ?? '',
    status: o.status ?? 'open',
    bookTitle: typeof extra.bookTitle === 'string' ? extra.bookTitle : '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function assertParticipant(exchangeRequestId, clerkUserId) {
  if (!mongoose.isValidObjectId(exchangeRequestId)) {
    return { error: 'Invalid exchange request id', status: 400 };
  }
  const row = await ExchangeRequest.findById(exchangeRequestId).lean();
  if (!row) {
    return { error: 'Exchange request not found', status: 404 };
  }
  if (row.ownerClerkUserId !== clerkUserId && row.requesterClerkUserId !== clerkUserId) {
    return { error: 'Not allowed', status: 403 };
  }
  if (row.status !== 'accepted') {
    return { error: 'Reports are only allowed for accepted exchanges', status: 400 };
  }
  const isRequester = row.requesterClerkUserId === clerkUserId;
  if (isRequester && !row.requesterConfirmedAt) {
    return { error: 'Confirm you received the book before filing a report', status: 400 };
  }
  return { row };
}

export async function createExchangeReport(req, res, next) {
  try {
    const { exchangeRequestId, details, evidencePhoto } = req.body ?? {};
    const chk = await assertParticipant(exchangeRequestId, req.clerkUserId);
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
      report: serializeReport(doc.toObject(), { bookTitle: book?.title ?? '' }),
    });
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
      return serializeReport(r, { bookTitle: book?.title ?? '' });
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
    if (row.reporterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const ex = await ExchangeRequest.findById(row.exchangeRequestId).lean();
    const book = ex ? await Book.findById(ex.bookId).lean() : null;
    return res.json({ report: serializeReport(row, { bookTitle: book?.title ?? '' }) });
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
    const ex = await ExchangeRequest.findById(row.exchangeRequestId).lean();
    const book = ex ? await Book.findById(ex.bookId).lean() : null;
    return res.json({ report: serializeReport(row.toObject(), { bookTitle: book?.title ?? '' }) });
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
    await row.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
