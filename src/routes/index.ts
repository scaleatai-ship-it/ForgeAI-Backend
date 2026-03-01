import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { projectsRouter } from "./projects.routes.js";
import { generationRouter } from "./generation.routes.js";
import { deploymentRouter } from "./deployment.routes.js";
import { dashboardUserRouter, adminDashboardRouter } from "./dashboard.routes.js";
import { billingRouter } from "./billing.routes.js";
import { settingsRouter } from "./settings.routes.js";
import { deploymentsRouter } from "./deployments.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/generate", generationRouter);
apiRouter.use("/deploy", deploymentRouter);
apiRouter.use("/dashboard", dashboardUserRouter);
apiRouter.use("/admin", adminDashboardRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/deployments", deploymentsRouter);
