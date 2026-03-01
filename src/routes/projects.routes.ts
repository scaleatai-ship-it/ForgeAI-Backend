import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createProject,
  deleteProject,
  getProject,
  getProjectFiles,
  listProjects,
  saveProjectFile,
  updateProject
} from "../controllers/projects.controller.js";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);
projectsRouter.get("/", asyncHandler(listProjects));
projectsRouter.post("/", asyncHandler(createProject));
projectsRouter.get("/:id", asyncHandler(getProject));
projectsRouter.put("/:id", asyncHandler(updateProject));
projectsRouter.delete("/:id", asyncHandler(deleteProject));
projectsRouter.get("/:id/files", asyncHandler(getProjectFiles));
projectsRouter.put("/:id/files", asyncHandler(saveProjectFile));
