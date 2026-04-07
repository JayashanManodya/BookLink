import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('BookLink DB connected');
    } catch (error) {
        console.error('Error connecting to BookLink DB:', error.message);
        process.exit(1);
    }
};

export default connectDB;
