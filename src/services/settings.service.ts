import crypto from "node:crypto";
import { NotificationLevel } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { hashToken } from "../utils/jwt.js";

export class SettingsService {
  async getSettings(userId: string) {
    const [user, apiKeys] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          notificationLevel: true,
          plan: true,
          credits: true
        }
      }),
      prisma.apiKey.findMany({
        where: {
          userId,
          revokedAt: null
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          name: true,
          last4: true,
          lastUsedAt: true,
          createdAt: true
        }
      })
    ]);

    return { user, apiKeys };
  }

  async updateProfile(
    userId: string,
    input: {
      name?: string;
      email?: string;
      avatar?: string;
    }
  ) {
    const data: { name?: string; email?: string; avatar?: string } = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.avatar !== undefined) {
      data.avatar = input.avatar;
    }

    if (input.email !== undefined) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing && existing.id !== userId) {
        throw new Error("Email already in use");
      }
      data.email = normalizedEmail;
    }

    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        notificationLevel: true,
        plan: true,
        credits: true
      }
    });
  }

  async updateNotifications(userId: string, notificationLevel: NotificationLevel) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        notificationLevel
      },
      select: {
        id: true,
        notificationLevel: true
      }
    });
  }

  async createApiKey(userId: string, name: string) {
    const rawToken = `fai_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = hashToken(rawToken);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        last4: rawToken.slice(-4)
      },
      select: {
        id: true,
        name: true,
        last4: true,
        createdAt: true
      }
    });

    return {
      ...apiKey,
      key: rawToken
    };
  }

  async listApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: {
        userId,
        revokedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        name: true,
        last4: true,
        lastUsedAt: true,
        createdAt: true
      }
    });
  }

  async revokeApiKey(userId: string, apiKeyId: string) {
    const updated = await prisma.apiKey.updateMany({
      where: {
        id: apiKeyId,
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return updated.count > 0;
  }

  async deleteAccount(userId: string) {
    await prisma.user.delete({
      where: { id: userId }
    });

    return { success: true };
  }
}
