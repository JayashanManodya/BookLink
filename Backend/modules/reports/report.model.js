import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    reporterId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    reportedUserId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    reportedBookId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book' 
    },
    reason: { 
        type: String, 
        enum: ['Fake Listing', 'Scammer', 'No Show', 'Bad Condition', 'Other'], 
        required: true 
    },
    description: { type: String, required: true, trim: true },
    evidencePhoto: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['Open', 'UnderReview', 'Resolved', 'Dismissed', 'Cancelled'], 
        default: 'Open' 
    },
    createdAt: { type: Date, default: Date.now },
});

// Pre-save hook to ensure at least one target is provided
ReportSchema.pre('save', function(next) {
    if (!this.reportedUserId && !this.reportedBookId) {
        return next(new Error('Report must target either a user or a book'));
    }
    next();
});

const Report = mongoose.model('Report', ReportSchema);

export default Report;
