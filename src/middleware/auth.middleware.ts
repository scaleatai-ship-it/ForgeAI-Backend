import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { authCookies, verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    const cookieToken = request.cookies?.[authCookies.ACCESS_COOKIE_NAME] as string | undefined;
    const token = bearerToken ?? cookieToken;

    if (!token) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }

    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, plan: true, isAdmin: true }
    });

    if (!user) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }

    request.user = user;
    next();
  } catch {
    response.status(401).json({ message: "Unauthorized" });
  }
}

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if (!request.user?.isAdmin) {
    response.status(403).json({ message: "Forbidden" });
    return;
  }

  next();
}
