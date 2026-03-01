import { z } from "zod";
import { AppType, Prisma, ProjectStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { addProjectGenerationJob } from "../queue/generation.queue.js";
import type { GeneratedProjectPayload } from "../types/api.js";
import { getPathParam } from "../utils/params.js";

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(AppType),
  prompt: z.string().min(10),
  options: z
    .object({
      techStack: z.array(z.string()).optional(),
      designStyle: z.string().optional(),
      features: z.array(z.string()).optional()
    })
    .optional()
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional()
});

const updateFileSchema = z.object({
  path: z.string().min(1),
  content: z.string()
});

export async function listProjects(request: Request, response: Response) {
  const projects = await prisma.project.findMany({
    where: { userId: request.user!.id },
    orderBy: { updatedAt: "desc" }
  });

  response.json({ projects });
}

export async function createProject(request: Request, response: Response) {
  const payload = createProjectSchema.parse(request.body);

  const project = await prisma.project.create({
    data: {
      name: payload.name,
      description: payload.description,
      type: payload.type,
      prompt: payload.prompt,
      status: ProjectStatus.GENERATING,
      userId: request.user!.id,
      generatedCode: {
        files: [],
        options: payload.options ?? {}
      }
    }
  });

  await addProjectGenerationJob(project.id, request.user!.id, payload.prompt, payload.type);

  response.status(201).json({ project });
}

export async function getProject(request: Request, response: Response) {
  const projectId = getPathParam(request, "id");
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: request.user!.id
    },
    include: {
      generations: {
        orderBy: { createdAt: "desc" },
        take: 20
      },
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  response.json({ project });
}

export async function updateProject(request: Request, response: Response) {
  const payload = updateProjectSchema.parse(request.body);
  const projectId = getPathParam(request, "id");

  const project = await prisma.project.updateMany({
    where: {
      id: projectId,
      userId: request.user!.id
    },
    data: payload
  });

  if (!project.count) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const updated = await prisma.project.findUnique({ where: { id: projectId } });
  response.json({ project: updated });
}

export async function deleteProject(request: Request, response: Response) {
  const projectId = getPathParam(request, "id");
  const deleted = await prisma.project.deleteMany({
    where: {
      id: projectId,
      userId: request.user!.id
    }
  });

  if (!deleted.count) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  response.json({ success: true });
}

export async function getProjectFiles(request: Request, response: Response) {
  const projectId = getPathParam(request, "id");
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: request.user!.id
    }
  });

  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const payload = project.generatedCode as GeneratedProjectPayload | null;

  response.json({
    files: payload?.files ?? []
  });
}

export async function saveProjectFile(request: Request, response: Response) {
  const payload = updateFileSchema.parse(request.body);
  const projectId = getPathParam(request, "id");

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: request.user!.id
    }
  });

  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const generatedCode = (project.generatedCode as GeneratedProjectPayload | null) ?? { files: [] };
  const files = generatedCode.files ?? [];

  const existingIndex = files.findIndex((file) => file.path === payload.path);

  if (existingIndex >= 0) {
    files[existingIndex] = payload;
  } else {
    files.push(payload);
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      generatedCode: {
        ...generatedCode,
        files
      } as Prisma.InputJsonValue
    }
  });

  response.json({
    files: (updated.generatedCode as GeneratedProjectPayload)?.files ?? []
  });
}
