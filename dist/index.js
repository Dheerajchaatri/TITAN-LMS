"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const teacher_1 = __importDefault(require("./routes/teacher"));
const student_1 = __importDefault(require("./routes/student"));
const general_1 = __importDefault(require("./routes/general"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // For development flexibility
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/teacher', teacher_1.default);
app.use('/api/student', student_1.default);
app.use('/api/general', general_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Socket.io Realtime Chat & Alerts
io.on('connection', (socket) => {
    console.log('Socket client connected:', socket.id);
    // User joins their personal room to receive private messages and alerts
    socket.on('join_user_room', (userId) => {
        socket.join(userId);
        console.log(`Socket user ${userId} joined room`);
    });
    // User joins a class discussion room
    socket.on('join_class_room', (classId) => {
        socket.join(classId);
        console.log(`Socket user joined discussion class: ${classId}`);
    });
    // Sending private chat message
    socket.on('send_private_message', (data) => {
        const { recipientId } = data;
        // Broadcast message to recipient's room
        io.to(recipientId).emit('receive_private_message', data);
    });
    // Discussion reply update
    socket.on('post_discussion_reply', (data) => {
        const { classId } = data;
        // Broadcast reply details to everyone in class discussion
        socket.to(classId).emit('receive_discussion_reply', data);
    });
    // Teacher sending course announcement
    socket.on('send_announcement', (data) => {
        const { classId } = data;
        io.to(classId).emit('receive_announcement', data);
    });
    socket.on('disconnect', () => {
        console.log('Socket client disconnected:', socket.id);
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error occurred' });
});
server.listen(PORT, () => {
    console.log(`LMS Server is active at http://localhost:${PORT}`);
});
