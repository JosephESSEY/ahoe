// src/shared/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import db from '../database/client';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if user still exists and is active
    const userQuery = `SELECT id, email, phone, status, role FROM users WHERE id = $1`;
    const userResult = await db.query(userQuery, [decoded.userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }

    if (user.status !== 'active' && user.status !== 'pending_verification') {
      return res.status(403).json({
        success: false,
        message: 'Compte suspendu ou supprimé'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    // Set user context for Row Level Security
    await db.query(`SET app.current_user_id = '${user.id}'`);

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};