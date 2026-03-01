import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { getPathParam } from "../utils/params.js";

export async function listDeployments(request: Request, response: Response) {
  const deployments = await prisma.deployment.findMany({
    where: {
      userId: request.user!.id
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }
  });

  response.json({ deployments });
}

export async function deploymentLogs(request: Request, response: Response) {
  const deploymentId = getPathParam(request, "id");
  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      userId: request.user!.id
    },
    select: {
      id: true,
      logs: true,
      status: true,
      url: true,
      platform: true,
      createdAt: true
    }
  });

  if (!deployment) {
    response.status(404).json({ message: "Deployment not found" });
    return;
  }

  response.json({ deployment });
}
