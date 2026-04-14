import mongoose from 'mongoose';

/**
 * Connect once per warm serverless instance; no-op if already connected.
 * Vercel loads `app.js` without running `server.js`, so routes must trigger connect.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  if (mongoose.connection.readyState === 1) {
    return;
  }
  await mongoose.connect(uri);
}
