import { z } from "zod";
import { Plan } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { authCookies } from "../utils/jwt.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8),
  plan: z.nativeEnum(Plan).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const oauthSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  avatar: z.string().url().optional()
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8)
});

export async function register(request: Request, response: Response) {
  const payload = registerSchema.parse(request.body);
  const user = await authService.register(payload);

  response.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      credits: user.credits
    }
  });
}

export async function login(request: Request, response: Response) {
  const payload = loginSchema.parse(request.body);
  const result = await authService.login(payload, response);
  response.json(result);
}

export async function oauthLogin(request: Request, response: Response) {
  const payload = oauthSchema.parse(request.body);
  const result = await authService.oauthLogin(payload, response);
  response.json(result);
}

export async function forgotPassword(request: Request, response: Response) {
  const payload = forgotPasswordSchema.parse(request.body);
  await authService.requestPasswordReset(payload.email);
  response.json({ success: true });
}

export async function resetPassword(request: Request, response: Response) {
  const payload = resetPasswordSchema.parse(request.body);
  await authService.resetPassword(payload);
  response.json({ success: true });
}

export async function logout(request: Request, response: Response) {
  const refreshToken =
    (request.cookies?.[authCookies.REFRESH_COOKIE_NAME] as string | undefined) ??
    (request.body?.refreshToken as string | undefined);

  await authService.logout(refreshToken, response);
  response.json({ success: true });
}

export async function me(request: Request, response: Response) {
  if (!request.user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      plan: true,
      credits: true,
      isAdmin: true,
      notificationLevel: true,
      createdAt: true
    }
  });

  response.json({ user });
}

export async function refresh(request: Request, response: Response) {
  const refreshToken =
    (request.cookies?.[authCookies.REFRESH_COOKIE_NAME] as string | undefined) ??
    (request.body?.refreshToken as string | undefined);

  if (!refreshToken) {
    response.status(401).json({ message: "Refresh token is required" });
    return;
  }

  const result = await authService.rotateRefreshToken(refreshToken, response);
  response.json(result);
}
