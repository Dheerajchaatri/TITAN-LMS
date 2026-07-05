"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply auth middleware globally to these routes
router.use(auth_1.authenticateJWT);
// 1. Discussion Forum
router.get('/classes/:classId/discussions', async (req, res) => {
    try {
        const discussions = await db_1.default.discussion.findMany({
            where: { classId: req.params.classId },
            include: {
                author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } } },
                replies: { include: { author: { select: { firstName: true, lastName: true } } } }
            },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
        });
        res.json(discussions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});
router.post('/classes/:classId/discussions', async (req, res) => {
    const { title, content, isPinned } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }
    try {
        const discussion = await db_1.default.discussion.create({
            data: {
                classId: req.params.classId,
                title,
                content,
                authorId: req.user.id,
                isPinned: isPinned || false
            },
            include: {
                author: { select: { firstName: true, lastName: true, avatarUrl: true } }
            }
        });
        res.status(201).json(discussion);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create discussion thread' });
    }
});
router.post('/discussions/:discussionId/replies', async (req, res) => {
    const { content } = req.body;
    if (!content)
        return res.status(400).json({ error: 'Reply content cannot be blank' });
    try {
        const reply = await db_1.default.discussionReply.create({
            data: {
                discussionId: req.params.discussionId,
                content,
                authorId: req.user.id
            },
            include: {
                author: { select: { firstName: true, lastName: true, avatarUrl: true } }
            }
        });
        res.status(201).json(reply);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to post reply' });
    }
});
// 2. Messaging/Chat
router.get('/messages', async (req, res) => {
    try {
        // List all users the user has conversed with
        const userId = req.user.id;
        const sent = await db_1.default.message.findMany({
            where: { senderId: userId },
            select: { recipient: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } } } }
        });
        const received = await db_1.default.message.findMany({
            where: { recipientId: userId },
            select: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } } } }
        });
        const contactsMap = new Map();
        sent.forEach(m => contactsMap.set(m.recipient.id, m.recipient));
        received.forEach(m => contactsMap.set(m.sender.id, m.sender));
        // Add additional users who can be contacted (Teachers for Students, etc.)
        // For simplicity, we also return the list of contacts
        res.json(Array.from(contactsMap.values()));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages contact history' });
    }
});
// Fetch full listing of other users to start new chat
router.get('/contacts', async (req, res) => {
    try {
        const users = await db_1.default.user.findMany({
            where: {
                id: { not: req.user.id }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: { select: { name: true } }
            }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve directory contacts' });
    }
});
router.get('/messages/chat/:withUserId', async (req, res) => {
    try {
        const userId = req.user.id;
        const withUserId = req.params.withUserId;
        const chatLogs = await db_1.default.message.findMany({
            where: {
                OR: [
                    { senderId: userId, recipientId: withUserId },
                    { senderId: withUserId, recipientId: userId }
                ]
            },
            orderBy: { createdAt: 'asc' }
        });
        // Mark as read
        await db_1.default.message.updateMany({
            where: { senderId: withUserId, recipientId: userId, isRead: false },
            data: { isRead: true, readAt: new Date() }
        });
        res.json(chatLogs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to load conversation' });
    }
});
router.post('/messages', async (req, res) => {
    const { recipientId, content } = req.body;
    if (!recipientId || !content) {
        return res.status(400).json({ error: 'Recipient and message content are required' });
    }
    try {
        const message = await db_1.default.message.create({
            data: {
                senderId: req.user.id,
                recipientId,
                content
            }
        });
        // We can emit realtime alerts later
        res.status(201).json(message);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});
// 3. Global Search across Courses, Announcements, Files
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q)
        return res.json({ courses: [], announcements: [] });
    try {
        const queryStr = String(q);
        const courses = await db_1.default.course.findMany({
            where: {
                OR: [
                    { code: { contains: queryStr } },
                    { title: { contains: queryStr } },
                    { description: { contains: queryStr } }
                ]
            }
        });
        const announcements = await db_1.default.announcement.findMany({
            where: {
                OR: [
                    { title: { contains: queryStr } },
                    { content: { contains: queryStr } }
                ]
            }
        });
        res.json({ courses, announcements });
    }
    catch (error) {
        res.status(500).json({ error: 'Global search failure' });
    }
});
exports.default = router;
