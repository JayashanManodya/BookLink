import mongoose from 'mongoose';

const PointSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    association: { type: String, default: '' },
    locationPhoto: { type: String, default: '' },
    addedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    operatingHours: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const Point = mongoose.model('Point', PointSchema);

export default Point;
