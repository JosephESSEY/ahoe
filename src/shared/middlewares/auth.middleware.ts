import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import db from '../database/client';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);

    const decoded = verifyAccessToken(token);

    const userQuery = `SELECT id, email, phone, status, role_id FROM users WHERE id = $1`;
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

    const roleQuery = `SELECT role_name FROM roles WHERE role_id = $1`;
    const roleResult = await db.query(roleQuery, [user.role_id]);
    const role = roleResult.rows[0];

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      phone: decoded.phone,
      role: role.role_name
    };

    // Set user context for Row Level Security
    // await db.query(`SET app.current_user_id = $1`, [user.id]);

    next();
  } catch (error: any) {
    console.log(error);
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