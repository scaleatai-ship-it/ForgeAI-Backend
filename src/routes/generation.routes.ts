import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  generateAndroid,
  generateIos,
  generateMobile,
  generateWeb,
  generationStatus,
  iterateProject
} from "../controllers/generation.controller.js";

export const generationRouter = Router();

generationRouter.use(requireAuth);
generationRouter.post("/web", asyncHandler(generateWeb));
generationRouter.post("/android", asyncHandler(generateAndroid));
generationRouter.post("/ios", asyncHandler(generateIos));
generationRouter.post("/mobile", asyncHandler(generateMobile));
generationRouter.post("/iterate", asyncHandler(iterateProject));
generationRouter.get("/:id/status", asyncHandler(generationStatus));
