import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createApiKey,
  deleteAccount,
  getSettings,
  listApiKeys,
  revokeApiKey,
  updateNotifications,
  updateProfile
} from "../controllers/settings.controller.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);
settingsRouter.get("/", asyncHandler(getSettings));
settingsRouter.put("/profile", asyncHandler(updateProfile));
settingsRouter.put("/notifications", asyncHandler(updateNotifications));
settingsRouter.get("/api-keys", asyncHandler(listApiKeys));
settingsRouter.post("/api-keys", asyncHandler(createApiKey));
settingsRouter.delete("/api-keys/:id", asyncHandler(revokeApiKey));
settingsRouter.delete("/account", asyncHandler(deleteAccount));
