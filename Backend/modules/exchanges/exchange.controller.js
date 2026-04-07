import Exchange from './exchange.model.js';
import Book from '../books/book.model.js';
import User from '../users/user.model.js';
import { getUserId } from '../../middleware/auth.js';

export const createRequest = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User profile not found. Please sync your profile first.' });
        }

        const { bookId, message } = req.body;
        const offeredBookPhoto = req.file ? req.file.path : '';

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.postedBy.toString() === user._id.toString()) {
            return res.status(400).json({ message: 'You cannot request your own book' });
        }

        const newExchange = new Exchange({
            bookId,
            requesterId: user._id,
            ownerId: book.postedBy,
            message,
            offeredBookPhoto,
        });

        const savedExchange = await newExchange.save();
        return res.status(201).json(savedExchange);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMySentRequests = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const exchanges = await Exchange.find({ requesterId: user._id })
            .populate('bookId', 'title coverImage status')
            .populate('ownerId', 'name university')
            .sort({ requestedAt: -1 });

        return res.status(200).json(exchanges);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMyReceivedRequests = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const exchanges = await Exchange.find({ ownerId: user._id })
            .populate('bookId', 'title coverImage status')
            .populate('requesterId', 'name university city')
            .sort({ requestedAt: -1 });

        return res.status(200).json(exchanges);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const exchange = await Exchange.findById(req.params.id);
        if (!exchange) {
            return res.status(404).json({ message: 'Exchange request not found' });
        }

        const { status: newStatus } = req.body;

        // Permissions check
        if (newStatus === 'Accepted' || newStatus === 'Rejected') {
            if (exchange.ownerId.toString() !== user._id.toString()) {
                return res.status(403).json({ message: 'Only the book owner can accept or reject' });
            }
        } else if (newStatus === 'Cancelled') {
            if (exchange.requesterId.toString() !== user._id.toString()) {
                return res.status(403).json({ message: 'Only the requester can cancel' });
            }
        }

        exchange.status = newStatus;

        if (newStatus === 'Accepted') {
            await Book.findByIdAndUpdate(exchange.bookId, { status: 'Exchanged' });
        }

        const updatedExchange = await exchange.save();
        return res.status(200).json(updatedExchange);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
