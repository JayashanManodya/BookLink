import Point from './point.model.js';
import User from '../users/user.model.js';
import { getUserId } from '../../middleware/auth.js';

export const submitPoint = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User profile not found. Please sync your profile first.' });
        }

        const { name, city, address, association, operatingHours, contactNumber } = req.body;
        const locationPhoto = req.file ? req.file.path : '';

        const newPoint = new Point({
            name,
            city,
            address,
            association,
            locationPhoto,
            operatingHours,
            contactNumber,
            addedBy: user._id,
        });

        const savedPoint = await newPoint.save();
        return res.status(201).json(savedPoint);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getAllPoints = async (req, res) => {
    try {
        const filter = {};
        if (req.query.city) {
            filter.city = { $regex: req.query.city, $options: 'i' };
        }

        const points = await Point.find(filter)
            .populate('addedBy', 'name university')
            .sort({ city: 1 });

        return res.status(200).json(points);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getPointById = async (req, res) => {
    try {
        const point = await Point.findById(req.params.id)
            .populate('addedBy', 'name university city');

        if (!point) {
            return res.status(404).json({ message: 'Collection point not found' });
        }

        return res.status(200).json(point);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const updatePoint = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        const point = await Point.findById(req.params.id);
        if (!point) {
            return res.status(404).json({ message: 'Collection point not found' });
        }

        if (point.addedBy.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this point' });
        }

        const { name, address, operatingHours, contactNumber } = req.body;
        if (name) point.name = name;
        if (address) point.address = address;
        if (operatingHours) point.operatingHours = operatingHours;
        if (contactNumber) point.contactNumber = contactNumber;
        if (req.file) point.locationPhoto = req.file.path;

        const updatedPoint = await point.save();
        return res.status(200).json(updatedPoint);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const deletePoint = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        const point = await Point.findById(req.params.id);
        if (!point) {
            return res.status(404).json({ message: 'Collection point not found' });
        }

        if (point.addedBy.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await point.deleteOne();
        return res.status(200).json({ message: 'Collection point deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
