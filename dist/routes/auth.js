"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-enterprise-lms-jwt';
// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { email },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (user.suspended) {
            return res.status(403).json({ error: 'Your account has been suspended' });
        }
        const isMatch = bcryptjs_1.default.compareSync(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
                role: user.role.name,
                permissions: user.role.permissions.map((rp) => rp.permission.name),
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});
// Check current user session
router.get('/me', auth_1.authenticateJWT, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { id: req.user.id },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            role: user.role.name,
            permissions: user.role.permissions.map((rp) => rp.permission.name),
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error fetching user' });
    }
});
// Password recovery mock
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email is required' });
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ error: 'No account associated with this email' });
        // Mock send mail
        res.json({ message: 'Password reset link has been dispatched to ' + email });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Change Password
router.post('/change-password', auth_1.authenticateJWT, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { id: req.user?.id } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const isMatch = bcryptjs_1.default.compareSync(oldPassword, user.passwordHash);
        if (!isMatch)
            return res.status(400).json({ error: 'Incorrect current password' });
        const salt = bcryptjs_1.default.genSaltSync(10);
        const passwordHash = bcryptjs_1.default.hashSync(newPassword, salt);
        await db_1.default.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
