import { Response, NextFunction, Request } from "express";

export function isAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req.user;

  if (!authReq) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (authReq.role !== "admin") {
    res.status(403).json({ message: "Forbidden, admin only" });
    return;
  }

  next();
}
