import mongoose from 'mongoose';
import { DATABASE_URL } from '../utils/constants';

export const connectDB = async () => {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};
