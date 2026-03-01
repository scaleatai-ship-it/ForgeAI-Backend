import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { deployMobile, deploymentStatus, deployWeb } from "../controllers/deployment.controller.js";

export const deploymentRouter = Router();

deploymentRouter.use(requireAuth);
deploymentRouter.post("/web/:projectId", asyncHandler(deployWeb));
deploymentRouter.post("/mobile/:projectId", asyncHandler(deployMobile));
deploymentRouter.get("/:projectId/status", asyncHandler(deploymentStatus));
