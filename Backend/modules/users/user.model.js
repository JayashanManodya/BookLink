import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    clerkId: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    university: { type: String, default: '' },
    city: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);

export default User;
