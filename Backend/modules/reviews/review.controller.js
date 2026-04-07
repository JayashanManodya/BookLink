import mongoose from 'mongoose';
import Review from './review.model.js';
import Exchange from '../exchanges/exchange.model.js';
import User from '../users/user.model.js';
import { getUserId } from '../../middleware/auth.js';

export const submitReview = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User profile not found. Please sync your profile first.' });
        }

        const { revieweeId, rating, comment, exchangeId } = req.body;
        const evidencePhoto = req.file ? req.file.path : '';

        const exchange = await Exchange.findById(exchangeId);
        if (!exchange) {
            return res.status(404).json({ message: 'Exchange not found' });
        }

        if (exchange.status !== 'Accepted') {
            return res.status(400).json({ message: 'Exchange must be Accepted before leaving a review' });
        }

        const existingReview = await Review.findOne({ exchangeId });
        if (existingReview) {
            return res.status(409).json({ message: 'You already reviewed this exchange' });
        }

        const newReview = new Review({
            reviewerId: user._id,
            revieweeId,
            exchangeId,
            rating,
            comment,
            evidencePhoto,
        });

        const savedReview = await newReview.save();
        return res.status(201).json(savedReview);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getReviewsForUser = async (req, res) => {
    try {
        const revieweeId = new mongoose.Types.ObjectId(req.params.userId);

        const reviews = await Review.find({ revieweeId })
            .populate('reviewerId', 'name profilePhoto')
            .sort({ createdAt: -1 });

        const stats = await Review.aggregate([
            { $match: { revieweeId } },
            {
                $group: {
                    _id: '$revieweeId',
                    averageRating: { $avg: '$rating' },
                },
            },
        ]);

        const averageRating = stats.length > 0 ? parseFloat(stats[0].averageRating.toFixed(1)) : 0;

        return res.status(200).json({
            reviews,
            averageRating,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMyGivenReviews = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const reviews = await Review.find({ reviewerId: user._id })
            .populate('revieweeId', 'name profilePhoto')
            .sort({ createdAt: -1 });

        return res.status(200).json(reviews);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.reviewerId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this review' });
        }

        await review.deleteOne();
        return res.status(200).json({ message: 'Review deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const flagReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.flagged = true;
        await review.save();
        return res.status(200).json(review);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
