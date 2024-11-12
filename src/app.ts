import express from 'express';
import bodyParser from 'body-parser';
import userRoutes from './routes/userRoutes';
import { connectDB } from './config/database';
import { API_URL } from './utils/constants';

import "dotenv/config";

const app = express();

app.use(bodyParser.json());

// Connect to MongoDB
connectDB();

// Routes
app.use(`${API_URL}/user`, userRoutes);

export default app;
