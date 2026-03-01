import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { GenerationService } from "../services/generation.service.js";
import { getPathParam } from "../utils/params.js";

const generationService = new GenerationService();

const promptSchema = z.object({
  prompt: z.string().min(10),
  projectId: z.string().min(1)
});

const iterateSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(3)
});

async function resolveProjectForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } });
}

export async function generateWeb(request: Request, response: Response) {
  const payload = promptSchema.parse(request.body);

  const project = await resolveProjectForUser(payload.projectId, request.user!.id);
  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const result = await generationService.generateWebApp(payload.prompt, payload.projectId, request.user!.id);
  response.json({ result });
}

export async function generateAndroid(request: Request, response: Response) {
  const payload = promptSchema.parse(request.body);

  const project = await resolveProjectForUser(payload.projectId, request.user!.id);
  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const result = await generationService.generateMobileApp(
    payload.prompt,
    payload.projectId,
    request.user!.id,
    "android"
  );
  response.json({ result });
}

export async function generateIos(request: Request, response: Response) {
  const payload = promptSchema.parse(request.body);

  const project = await resolveProjectForUser(payload.projectId, request.user!.id);
  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const result = await generationService.generateMobileApp(
    payload.prompt,
    payload.projectId,
    request.user!.id,
    "ios"
  );
  response.json({ result });
}

export async function generateMobile(request: Request, response: Response) {
  const payload = promptSchema.parse(request.body);

  const project = await resolveProjectForUser(payload.projectId, request.user!.id);
  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const result = await generationService.generateMobileApp(
    payload.prompt,
    payload.projectId,
    request.user!.id,
    "mobile"
  );
  response.json({ result });
}

export async function iterateProject(request: Request, response: Response) {
  const payload = iterateSchema.parse(request.body);

  const project = await resolveProjectForUser(payload.projectId, request.user!.id);
  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const result = await generationService.iterateProject(payload.projectId, request.user!.id, payload.prompt);
  response.json({ result });
}

export async function generationStatus(request: Request, response: Response) {
  const projectId = getPathParam(request, "id");
  const generation = await prisma.generation.findFirst({
    where: {
      projectId,
      userId: request.user!.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!generation) {
    response.status(404).json({ message: "Generation not found" });
    return;
  }

  response.json({ generation });
}
