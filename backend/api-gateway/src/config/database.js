/** MongoDB connection lifecycle via Mongoose. */
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri) {
  if (!uri) throw new Error('MongoDB URI is not configured');
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info('MongoDB connected', { host: mongoose.connection.host });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

/** True when the driver reports an open connection (readyState 1). */
export const isDatabaseConnected = () => mongoose.connection.readyState === 1;
