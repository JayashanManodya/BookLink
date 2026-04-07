import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
    reviewerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    revieweeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    exchangeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Exchange', 
        required: true,
        unique: true
    },
    rating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 
    },
    comment: { type: String, default: '' },
    evidencePhoto: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    flagged: { type: Boolean, default: false },
});

const Review = mongoose.model('Review', ReviewSchema);

export default Review;
