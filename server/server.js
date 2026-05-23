import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import aiRoutes from './routes/aiRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import connectDB from './config/db.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/code', codeRoutes);

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Apollo Backend is running' });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`Apollo server running on port ${PORT}`);
});
