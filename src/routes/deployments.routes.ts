import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { deploymentLogs, listDeployments } from "../controllers/deployments.controller.js";

export const deploymentsRouter = Router();

deploymentsRouter.use(requireAuth);
deploymentsRouter.get("/", asyncHandler(listDeployments));
deploymentsRouter.get("/:id/logs", asyncHandler(deploymentLogs));
