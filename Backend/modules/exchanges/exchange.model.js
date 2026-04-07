import mongoose from 'mongoose';

const ExchangeSchema = new mongoose.Schema({
    bookId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book', 
        required: true 
    },
    requesterId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    ownerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    message: { type: String, default: '' },
    offeredBookPhoto: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled'], 
        default: 'Pending' 
    },
    requestedAt: { type: Date, default: Date.now },
});

const Exchange = mongoose.model('Exchange', ExchangeSchema);

export default Exchange;
