import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from './src/app.js';

const port = Number(process.env.PORT || 5000);
const uri = process.env.MONGODB_URI;

if (!uri) {
  // eslint-disable-next-line no-console
  console.error('Set MONGODB_URI in Backend/.env');
  process.exit(1);
}

await mongoose.connect(uri);
// eslint-disable-next-line no-console
console.log('MongoDB connected');

const server = http.createServer(app);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(`Port ${port} is already in use. Stop the other process or set PORT in .env to another value.`);
  } else {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  process.exit(1);
});
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`BookLink API http://localhost:${port}`);
});
