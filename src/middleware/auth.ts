import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-enterprise-lms-jwt';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, async (err, payload: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token is invalid or expired' });
      }

      try {
        const user = await prisma.user.findUnique({
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
      } catch (error) {
        return res.status(500).json({ error: 'Authentication internal error' });
      }
    });
  } else {
    res.status(401).json({ error: 'Authorization header missing' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated request' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient privileges' });
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated request' });
    }

    if (!req.user.permissions.includes(permission) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: missing permission ' + permission });
    }

    next();
  };
};
