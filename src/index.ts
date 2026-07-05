import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import teacherRouter from './routes/teacher';
import studentRouter from './routes/student';
import generalRouter from './routes/general';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development flexibility
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);
app.use('/api/general', generalRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io Realtime Chat & Alerts
io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  // User joins their personal room to receive private messages and alerts
  socket.on('join_user_room', (userId: string) => {
    socket.join(userId);
    console.log(`Socket user ${userId} joined room`);
  });

  // User joins a class discussion room
  socket.on('join_class_room', (classId: string) => {
    socket.join(classId);
    console.log(`Socket user joined discussion class: ${classId}`);
  });

  // Sending private chat message
  socket.on('send_private_message', (data: { senderId: string; recipientId: string; content: string; senderName: string }) => {
    const { recipientId } = data;
    // Broadcast message to recipient's room
    io.to(recipientId).emit('receive_private_message', data);
  });

  // Discussion reply update
  socket.on('post_discussion_reply', (data: { classId: string; discussionId: string; authorName: string; content: string }) => {
    const { classId } = data;
    // Broadcast reply details to everyone in class discussion
    socket.to(classId).emit('receive_discussion_reply', data);
  });

  // Teacher sending course announcement
  socket.on('send_announcement', (data: { classId: string; title: string; content: string }) => {
    const { classId } = data;
    io.to(classId).emit('receive_announcement', data);
  });

  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error occurred' });
});

server.listen(PORT, () => {
  console.log(`LMS Server is active at http://localhost:${PORT}`);
});
