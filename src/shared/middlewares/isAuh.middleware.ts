import { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";
import env from "../../environment/env.config";

interface UserPayload {
  id: string;
  pseudo: string;
  role: "admin" | "user";
}

function isValidUserPayload(payload: any): payload is UserPayload {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.id === "string" &&
    typeof payload.pseudo === "string" &&
    (payload.role === "admin" || payload.role === "user")
  );
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token manquant" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded !== "object" || !isValidUserPayload(decoded)) {
      res.status(401).json({ message: "Structure du token invalide" });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token expiré ou invalide" });
  }
}