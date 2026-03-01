import Queue from "bull";
import type { Server as SocketIOServer } from "socket.io";
import { AppType, ProjectStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { GenerationService } from "../services/generation.service.js";
import type { GenerationJob } from "../types/api.js";

let generationQueue: Queue.Queue<GenerationJob> | null = null;

export function getGenerationQueue() {
  if (!generationQueue) {
    generationQueue = new Queue<GenerationJob>("forge-generation", env.REDIS_URL);
  }

  return generationQueue;
}

export async function initGenerationWorker(_io: SocketIOServer) {
  const queue = getGenerationQueue();
  const generationService = new GenerationService();

  queue.process(3, async (job) => {
    const { projectId, userId, prompt, type } = job.data;

    await generationService.generateByType(type, prompt, projectId, userId);
  });

  queue.on("failed", async (job, error) => {
    if (!job) {
      return;
    }

    await prisma.project.update({
      where: { id: job.data.projectId },
      data: { status: ProjectStatus.FAILED }
    });

    console.error("Generation job failed", { projectId: job.data.projectId, error: error.message });
  });
}

export async function addProjectGenerationJob(projectId: string, userId: string, prompt: string, appType: AppType) {
  const queue = getGenerationQueue();
  const type: GenerationJob["type"] =
    appType === AppType.WEB
      ? "web"
      : appType === AppType.ANDROID
        ? "android"
        : appType === AppType.IOS
          ? "ios"
          : "mobile";

  await queue.add(
    {
      projectId,
      userId,
      prompt,
      type
    },
    {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 1500
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  );
}
