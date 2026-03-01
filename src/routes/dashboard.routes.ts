import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { adminStats, dashboardStats, dashboardUsage } from "../controllers/dashboard.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import { recentSignups } from "../controllers/admin.controller.js";

export const dashboardRouter = Router();

const userRouter = Router();
userRouter.use(requireAuth);
userRouter.get("/stats", asyncHandler(dashboardStats));
userRouter.get("/usage", asyncHandler(dashboardUsage));

const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.get("/stats", asyncHandler(adminStats));
adminRouter.get("/signups", asyncHandler(recentSignups));

export const dashboardUserRouter = userRouter;
export const adminDashboardRouter = adminRouter;
