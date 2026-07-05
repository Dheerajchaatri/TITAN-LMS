"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.requireRole = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-enterprise-lms-jwt';
const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, payload) => {
            if (err) {
                return res.status(403).json({ error: 'Token is invalid or expired' });
            }
            try {
                const user = await db_1.default.user.findUnique({
                    where: { id: payload.id },
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
                if (!user || user.suspended) {
                    return res.status(403).json({ error: 'User not found or suspended' });
                }
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role.name,
                    permissions: user.role.permissions.map((rp) => rp.permission.name),
                };
                next();
            }
            catch (error) {
                return res.status(500).json({ error: 'Authentication internal error' });
            }
        });
    }
    else {
        res.status(401).json({ error: 'Authorization header missing' });
    }
};
exports.authenticateJWT = authenticateJWT;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthenticated request' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied: insufficient privileges' });
        }
        next();
    };
};
exports.requireRole = requireRole;
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthenticated request' });
        }
        if (!req.user.permissions.includes(permission) && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied: missing permission ' + permission });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
