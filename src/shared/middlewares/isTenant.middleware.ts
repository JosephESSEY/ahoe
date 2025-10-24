import { Request, Response, NextFunction } from "express";
import { RoleType } from "../../features/auth/auth.model";

export function isTenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const user = req.user;

  const allowedRoles = [RoleType.TENANT];

  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({
      success: false,
      message: "Access denied: tenant only.",
    });
    return;
  }

  next();
}
