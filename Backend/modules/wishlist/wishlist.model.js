import mongoose from 'mongoose';

const WishlistSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    bookTitle: { type: String, required: true, trim: true },
    author: { type: String, default: '' },
    subject: { type: String, default: '' },
    grade: { type: String, default: '' },
    urgency: { 
        type: String, 
        enum: ['Low', 'Medium', 'High'], 
        default: 'Medium' 
    },
    wantedBookPhoto: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['Open', 'Fulfilled'], 
        default: 'Open' 
    },
    createdAt: { type: Date, default: Date.now },
});

const Wishlist = mongoose.model('Wishlist', WishlistSchema);

export default Wishlist;
