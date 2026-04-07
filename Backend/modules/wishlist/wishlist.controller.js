import Wishlist from './wishlist.model.js';
import Book from '../books/book.model.js';
import User from '../users/user.model.js';
import { getUserId } from '../../middleware/auth.js';

export const postWishlistItem = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User profile not found. Please sync your profile first.' });
        }

        const { bookTitle, author, subject, grade, urgency } = req.body;
        const wantedBookPhoto = req.file ? req.file.path : '';

        const newItem = new Wishlist({
            userId: user._id,
            bookTitle,
            author,
            subject,
            grade,
            urgency,
            wantedBookPhoto,
        });

        const savedItem = await newItem.save();
        return res.status(201).json(savedItem);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getAllOpenWishlists = async (req, res) => {
    try {
        const filter = { status: 'Open' };
        if (req.query.subject) filter.subject = req.query.subject;
        if (req.query.grade) filter.grade = req.query.grade;
        if (req.query.urgency) filter.urgency = req.query.urgency;

        const wishlists = await Wishlist.find(filter)
            .populate('userId', 'name university')
            .sort({ createdAt: -1 });

        return res.status(200).json(wishlists);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMyWishlist = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const wishlists = await Wishlist.find({ userId: user._id })
            .sort({ createdAt: -1 });

        return res.status(200).json(wishlists);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMatches = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const myWishlist = await Wishlist.find({ userId: user._id, status: 'Open' });
        const results = [];

        for (const item of myWishlist) {
            const matches = await Book.find({
                status: 'Available',
                $or: [
                    { title: { $regex: item.bookTitle, $options: 'i' } },
                    { 
                        subject: item.subject, 
                        grade: item.grade 
                    }
                ],
                postedBy: { $ne: user._id } // Don't match own books
            }).populate('postedBy', 'name university city');

            results.push({
                wishlistItem: item,
                matches,
            });
        }

        return res.status(200).json(results);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const updateItem = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        const item = await Wishlist.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Wishlist item not found' });
        }

        if (item.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { urgency, status } = req.body;
        if (urgency) item.urgency = urgency;
        if (status) item.status = status;
        if (req.file) item.wantedBookPhoto = req.file.path;

        const updatedItem = await item.save();
        return res.status(200).json(updatedItem);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const deleteItem = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        const item = await Wishlist.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Wishlist item not found' });
        }

        if (item.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await item.deleteOne();
        return res.status(200).json({ message: 'Wishlist item deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
