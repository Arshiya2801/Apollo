import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import aiRoutes from './routes/aiRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import connectDB from './config/db.js';
import initInterviewSockets from './sockets/interviewSockets.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust this in production
    methods: ['GET', 'POST']
  }
});
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

// Initialize WebSockets
initInterviewSockets(io);

// ── Start Server ──
httpServer.listen(PORT, () => {
  console.log(`Apollo server running on port ${PORT}`);
});
