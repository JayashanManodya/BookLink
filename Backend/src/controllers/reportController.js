import mongoose from 'mongoose';
import { clerkClient } from '@clerk/express';
import { Book } from '../models/Book.js';
import { Report, REPORT_REASONS } from '../models/Report.js';

async function displayNameFor(clerkUserId) {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const first = user.firstName?.trim() || 'Reader';
    const last = user.lastName?.trim();
    return last ? `${first} ${last.charAt(0)}.` : first;
  } catch {
    return 'Reader';
  }
}

function serializeReport(doc, extras = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    reporterClerkUserId: o.reporterClerkUserId,
    reportedUserClerkId: o.reportedUserClerkId || '',
    reportedBookId: o.reportedBookId ? String(o.reportedBookId) : null,
    reason: o.reason,
    description: o.description,
    evidencePhoto: o.evidencePhoto,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    ...extras,
  };
}

export async function submitReport(req, res, next) {
  try {
    const reporterId = req.clerkUserId;
    if (!reporterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { reportedUserClerkId, reportedBookId, reason, description, evidencePhoto } = req.body ?? {};
    const userId =
      reportedUserClerkId == null || reportedUserClerkId === ''
        ? ''
        : String(reportedUserClerkId).trim();
    let bookId = null;
    if (reportedBookId != null && String(reportedBookId).trim()) {
      const sid = String(reportedBookId).trim();
      if (!mongoose.isValidObjectId(sid)) {
        return res.status(400).json({ error: 'Invalid reportedBookId' });
      }
      bookId = sid;
    }
    if (!userId && !bookId) {
      return res.status(400).json({ error: 'reportedUserClerkId or reportedBookId is required' });
    }
    if (userId && userId === reporterId) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }
    const reasonStr = typeof reason === 'string' ? reason.trim() : '';
    if (!REPORT_REASONS.includes(reasonStr)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }
    const report = await Report.create({
      reporterClerkUserId: reporterId,
      reportedUserClerkId: userId,
      reportedBookId: bookId,
      reason: reasonStr,
      description: description.trim().slice(0, 8000),
      evidencePhoto: typeof evidencePhoto === 'string' ? evidencePhoto.trim().slice(0, 4000) : '',
      status: 'Open',
    });
    return res.status(201).json({ report: serializeReport(report) });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      const first = err.errors ? Object.values(err.errors)[0] : null;
      const msg = first?.message || err.message || 'Invalid report data';
      return res.status(400).json({ error: msg });
    }
    if (err?.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid report data' });
    }
    return next(err);
  }
}

export async function getMyReports(req, res, next) {
  try {
    const rows = await Report.find({ reporterClerkUserId: req.clerkUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const bookIds = [...new Set(rows.map((r) => r.reportedBookId).filter(Boolean).map(String))];
    const books =
      bookIds.length > 0 ? await Book.find({ _id: { $in: bookIds } }).select({ title: 1 }).lean() : [];
    const bookTitleById = Object.fromEntries(books.map((b) => [String(b._id), b.title]));
    const userIds = [...new Set(rows.map((r) => r.reportedUserClerkId).filter(Boolean))];
    const userNameById = Object.fromEntries(
      await Promise.all(userIds.map(async (id) => [id, await displayNameFor(id)]))
    );
    const reports = rows.map((r) =>
      serializeReport(r, {
        reportedUserDisplayName: r.reportedUserClerkId ? userNameById[r.reportedUserClerkId] : '',
        reportedBookTitle: r.reportedBookId ? bookTitleById[String(r.reportedBookId)] ?? '' : '',
      })
    );
    return res.json({ reports });
  } catch (err) {
    return next(err);
  }
}

export async function getReportById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const report = await Report.findById(id).lean();
    if (!report) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (report.reporterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the reporter can view this report' });
    }
    let reportedBookTitle = '';
    if (report.reportedBookId) {
      const b = await Book.findById(report.reportedBookId).select({ title: 1 }).lean();
      reportedBookTitle = b?.title ?? '';
    }
    const reportedUserDisplayName = report.reportedUserClerkId
      ? await displayNameFor(report.reportedUserClerkId)
      : '';
    return res.json({
      report: serializeReport(report, { reportedBookTitle, reportedUserDisplayName }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateReportStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body ?? {};
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await Report.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    const finalStates = ['Resolved', 'Dismissed'];
    if (finalStates.includes(row.status)) {
      return res.status(400).json({ error: 'This report is already closed' });
    }
    const me = req.clerkUserId;
    if (status === 'Cancelled') {
      if (row.reporterClerkUserId !== me) {
        return res.status(403).json({ error: 'Only the reporter can cancel' });
      }
      if (row.status !== 'Open') {
        return res.status(400).json({ error: 'Only open reports can be cancelled' });
      }
      row.status = 'Cancelled';
      await row.save();
      return res.json({ report: serializeReport(row) });
    }
    if (status === 'UnderReview') {
      if (row.status !== 'Open') {
        return res.status(400).json({ error: 'Invalid transition' });
      }
      row.status = 'UnderReview';
      await row.save();
      return res.json({ report: serializeReport(row) });
    }
    return res.status(400).json({ error: 'Unsupported status update' });
  } catch (err) {
    return next(err);
  }
}

export async function deleteReport(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await Report.findById(id);
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (row.reporterClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the reporter can delete this report' });
    }
    if (row.status !== 'Open') {
      return res.status(400).json({ error: 'Only open reports can be deleted' });
    }
    await row.deleteOne();
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
