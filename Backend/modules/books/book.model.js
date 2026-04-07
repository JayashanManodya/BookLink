import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, default: '' },
    grade: { type: String, default: '' },
    year: { type: Number },
    condition: { 
        type: String, 
        enum: ['New', 'Good', 'Fair', 'Poor'], 
        default: 'Good' 
    },
    language: { 
        type: String, 
        enum: ['Sinhala', 'Tamil', 'English'], 
        default: 'Sinhala' 
    },
    coverImage: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['Available', 'Exchanged'], 
        default: 'Available' 
    },
    postedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    createdAt: { type: Date, default: Date.now },
});

const Book = mongoose.model('Book', BookSchema);

export default Book;
