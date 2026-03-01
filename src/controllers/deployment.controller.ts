import type { Request, Response } from "express";
import { DeploymentService } from "../services/deployment.service.js";
import { getPathParam } from "../utils/params.js";

const deploymentService = new DeploymentService();

export async function deployWeb(request: Request, response: Response) {
  const projectId = getPathParam(request, "projectId");
  const result = await deploymentService.deployWeb(projectId, request.user!.id);
  response.json(result);
}

export async function deployMobile(request: Request, response: Response) {
  const projectId = getPathParam(request, "projectId");
  const result = await deploymentService.deployMobile(projectId, request.user!.id);
  response.json(result);
}

export async function deploymentStatus(request: Request, response: Response) {
  const projectId = getPathParam(request, "projectId");
  const deployment = await deploymentService.getDeploymentStatus(projectId, request.user!.id);

  if (!deployment) {
    response.status(404).json({ message: "Deployment not found" });
    return;
  }

  response.json({ deployment });
}
