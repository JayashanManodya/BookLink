import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { connectDB } from './db.js';
import bookRoutes from './routes/bookRoutes.js';
import exchangeRequestRoutes from './routes/exchangeRequestRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import pointRoutes from './routes/pointRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import exchangeReportRoutes from './routes/exchangeReportRoutes.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});
app.use(clerkMiddleware());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'booklink-api' });
});

app.use('/api/books', bookRoutes);
app.use('/api/exchange-requests', exchangeRequestRoutes);
app.use('/api/requests', exchangeRequestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/reports', exchangeReportRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.statusCode ?? 500;
  res.status(status).json({ error: err.message ?? 'Internal Server Error' });
});

export default app;
