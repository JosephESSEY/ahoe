// src/shared/middlewares/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { RoleType } from '../../features/auth/auth.model';
import db from '../database/client';

export const requireRole = (...allowedRoles: RoleType[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      // Get user roles
      const query = `SELECT role_type FROM user_roles WHERE user_id = $1`;
      const result = await db.query(query, [userId]);
      const userRoles = result.rows.map(r => r.role_type);

      // Check if user has at least one allowed role
      const hasRole = userRoles.some(role => allowedRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erreur de vérification des permissions'
      });
    }
  };
};

export const requireVerifiedRole = (roleType: RoleType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      // Check if user has verified role
      const query = `
        SELECT is_verified FROM user_roles 
        WHERE user_id = $1 AND role_type = $2
      `;
      const result = await db.query(query, [userId, roleType]);

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Rôle ${roleType} requis`
        });
      }

      if (!result.rows[0].is_verified) {
        return res.status(403).json({
          success: false,
          message: `Rôle ${roleType} non vérifié. Contactez le support.`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erreur de vérification du rôle'
      });
    }
  };
};