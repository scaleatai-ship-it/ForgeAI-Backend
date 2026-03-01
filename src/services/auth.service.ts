import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Plan } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import {
  clearAuthCookies,
  getRefreshTokenExpiryDate,
  hashToken,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../utils/jwt.js";
import { EmailService } from "./email.service.js";

type CookieResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
};

type ClearCookieResponse = {
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

export class AuthService {
  private emailService = new EmailService();

  private async issueSessionTokens(
    user: {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
      plan: Plan;
      credits: number;
      isAdmin: boolean;
    },
    response: CookieResponse
  ) {
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: getRefreshTokenExpiryDate()
      }
    });

    setAuthCookies(response, accessToken, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        plan: user.plan,
        credits: user.credits,
        isAdmin: user.isAdmin
      }
    };
  }

  async register(input: {
    email: string;
    name?: string;
    password: string;
    plan?: Plan;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      throw new Error("Email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: input.name,
        passwordHash,
        plan: input.plan ?? Plan.FREE
      }
    });

    return user;
  }

  async oauthLogin(
    input: {
      email: string;
      name?: string;
      avatar?: string;
    },
    response: CookieResponse
  ) {
    const normalizedEmail = input.email.trim().toLowerCase();

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: input.name,
          avatar: input.avatar,
          plan: Plan.FREE
        }
      });
    } else if ((input.name && user.name !== input.name) || (input.avatar && user.avatar !== input.avatar)) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: input.name,
          avatar: input.avatar
        }
      });
    }

    return this.issueSessionTokens(user, response);
  }

  async login(input: { email: string; password: string }, response: CookieResponse) {
    const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });

    if (!user?.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new Error("Invalid credentials");
    }

    return this.issueSessionTokens(user, response);
  }

  async logout(refreshToken: string | undefined, response: ClearCookieResponse) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }

    clearAuthCookies(response);
  }

  async rotateRefreshToken(refreshToken: string, response: CookieResponse) {
    const decoded = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const persistedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !persistedToken ||
      persistedToken.revokedAt ||
      persistedToken.expiresAt.getTime() < Date.now() ||
      persistedToken.userId !== decoded.userId
    ) {
      throw new Error("Invalid refresh token");
    }

    await prisma.refreshToken.update({
      where: { id: persistedToken.id },
      data: { revokedAt: new Date() }
    });

    return this.issueSessionTokens(persistedToken.user, response);
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return { success: true };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    const resetUrl = `${env.PASSWORD_RESET_BASE_URL}?token=${rawToken}`;
    await this.emailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl
    });

    return { success: true };
  }

  async resetPassword(input: { token: string; password: string }) {
    const tokenHash = hashToken(input.token.trim());

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() < Date.now() ||
      !resetToken.user
    ) {
      throw new Error("Reset token is invalid or expired");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      })
    ]);

    return { success: true };
  }
}
