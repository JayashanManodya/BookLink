import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Temporary router for placeholders
const tempRouter = express.Router();
tempRouter.get('/', (req, res) => {
    res.json({ message: 'module coming soon' });
});

app.use('/api/users', tempRouter);
app.use('/api/books', tempRouter);
app.use('/api/requests', tempRouter);
app.use('/api/reviews', tempRouter);
app.use('/api/wishlist', tempRouter);
app.use('/api/points', tempRouter);
app.use('/api/reports', tempRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`BookLink server running on port ${PORT}`);
});
