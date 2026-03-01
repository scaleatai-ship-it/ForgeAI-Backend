import { z } from "zod";
import { NotificationLevel } from "@prisma/client";
import type { Request, Response } from "express";
import { SettingsService } from "../services/settings.service.js";
import { clearAuthCookies } from "../utils/jwt.js";
import { getPathParam } from "../utils/params.js";

const settingsService = new SettingsService();

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional()
});

const notificationsSchema = z.object({
  notificationLevel: z.nativeEnum(NotificationLevel)
});

const apiKeySchema = z.object({
  name: z.string().min(2).max(80)
});

export async function getSettings(request: Request, response: Response) {
  const settings = await settingsService.getSettings(request.user!.id);
  response.json(settings);
}

export async function updateProfile(request: Request, response: Response) {
  const payload = profileSchema.parse(request.body);
  const user = await settingsService.updateProfile(request.user!.id, payload);
  response.json({ user });
}

export async function updateNotifications(request: Request, response: Response) {
  const payload = notificationsSchema.parse(request.body);
  const user = await settingsService.updateNotifications(request.user!.id, payload.notificationLevel);
  response.json({ user });
}

export async function createApiKey(request: Request, response: Response) {
  const payload = apiKeySchema.parse(request.body);
  const apiKey = await settingsService.createApiKey(request.user!.id, payload.name);
  response.status(201).json({ apiKey });
}

export async function listApiKeys(request: Request, response: Response) {
  const apiKeys = await settingsService.listApiKeys(request.user!.id);
  response.json({ apiKeys });
}

export async function revokeApiKey(request: Request, response: Response) {
  const apiKeyId = getPathParam(request, "id");
  const revoked = await settingsService.revokeApiKey(request.user!.id, apiKeyId);

  if (!revoked) {
    response.status(404).json({ message: "API key not found" });
    return;
  }

  response.json({ success: true });
}

export async function deleteAccount(request: Request, response: Response) {
  await settingsService.deleteAccount(request.user!.id);
  clearAuthCookies(response);
  response.json({ success: true });
}
