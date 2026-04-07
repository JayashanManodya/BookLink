import Report from './report.model.js';
import User from '../users/user.model.js';
import { getUserId } from '../../middleware/auth.js';

export const submitReport = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User profile not found. Please sync your profile first.' });
        }

        const { reportedUserId, reportedBookId, reason, description } = req.body;
        const evidencePhoto = req.file ? req.file.path : '';

        if (reportedUserId && reportedUserId.toString() === user._id.toString()) {
            return res.status(400).json({ message: 'You cannot report yourself' });
        }

        if (!reportedUserId && !reportedBookId) {
            return res.status(400).json({ message: 'Must provide a reported user or book' });
        }

        const newReport = new Report({
            reporterId: user._id,
            reportedUserId,
            reportedBookId,
            reason,
            description,
            evidencePhoto,
        });

        const savedReport = await newReport.save();
        return res.status(201).json(savedReport);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMyReports = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const reports = await Report.find({ reporterId: user._id })
            .populate('reportedUserId', 'name email')
            .populate('reportedBookId', 'title coverImage')
            .sort({ createdAt: -1 });

        return res.status(200).json(reports);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getReportById = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.reporterId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this report' });
        }

        return res.status(200).json(report);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const { status: newStatus } = req.body;
        const finalStates = ['Resolved', 'Dismissed'];

        if (finalStates.includes(report.status)) {
            return res.status(400).json({ message: 'This report is closed and cannot be updated' });
        }

        if (newStatus === 'Cancelled') {
            if (report.reporterId.toString() !== user._id.toString()) {
                return res.status(403).json({ message: 'Only the reporter can cancel' });
            }
        }

        report.status = newStatus;
        const updatedReport = await report.save();
        return res.status(200).json(updatedReport);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const deleteReport = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.reporterId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (report.status !== 'Open') {
            return res.status(400).json({ message: 'Can only delete an Open report' });
        }

        await report.deleteOne();
        return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
