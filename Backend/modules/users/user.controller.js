import User from './user.model.js';
import { getUserId } from '../../middleware/auth.js';

export const syncUser = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const { name, email } = req.body;

        const user = await User.findOneAndUpdate(
            { clerkId },
            { $set: { name, email } },
            { upsert: true, new: true }
        );

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const { university, city, profilePhoto } = req.body;

        const updatedUser = await User.findOneAndUpdate(
            { clerkId },
            { $set: { university, city, profilePhoto } },
            { new: true }
        );

        return res.status(200).json(updatedUser);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
