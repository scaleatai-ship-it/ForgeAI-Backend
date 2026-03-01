import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import axios from "axios";
import QRCode from "qrcode";
import { ProjectStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { getSocketServer } from "../config/socket.js";
import type { GeneratedProjectPayload } from "../types/api.js";

const DOWNLOADS_DIR = "/tmp/forge-ai-downloads";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function emitDeploymentUpdate(projectId: string, status: string, url: string | null) {
  const io = getSocketServer();
  io.to(projectId).emit("deployment:update", { projectId, status, url });
}

async function createZip(projectId: string, payload: GeneratedProjectPayload) {
  await fs.promises.mkdir(DOWNLOADS_DIR, { recursive: true });

  const archivePath = path.join(DOWNLOADS_DIR, `${projectId}.zip`);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);

    payload.files.forEach((file) => {
      archive.append(file.content, { name: file.path });
    });

    archive.finalize().catch(reject);
  });

  return archivePath;
}

export class DeploymentService {
  async deployWeb(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });

    if (!project) {
      throw new Error("Project not found");
    }

    const payload = project.generatedCode as GeneratedProjectPayload | null;
    if (!payload?.files?.length) {
      throw new Error("Project has no generated files");
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        userId,
        platform: "vercel",
        status: "in_progress"
      }
    });

    emitDeploymentUpdate(projectId, "in_progress", null);

    try {
      let deploymentUrl = `https://${slugify(project.name)}-${projectId.slice(-6)}.vercel.app`;

      if (env.VERCEL_TOKEN) {
        const response = await axios.post(
          "https://api.vercel.com/v13/deployments",
          {
            name: slugify(project.name),
            files: payload.files.map((file) => ({ file: file.path, data: file.content })),
            projectSettings: {
              framework: null
            },
            teamId: env.VERCEL_TEAM_ID,
            project: env.VERCEL_PROJECT_ID
          },
          {
            headers: {
              Authorization: `Bearer ${env.VERCEL_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );

        deploymentUrl = response.data?.url ? `https://${response.data.url}` : deploymentUrl;
      }

      await prisma.$transaction([
        prisma.deployment.update({
          where: { id: deployment.id },
          data: {
            status: "ready",
            url: deploymentUrl,
            logs: "Deployment completed"
          }
        }),
        prisma.project.update({
          where: { id: projectId },
          data: {
            status: ProjectStatus.DEPLOYED,
            deployUrl: deploymentUrl
          }
        }),
        prisma.usageLog.create({
          data: {
            userId,
            projectId,
            type: "deployment_web",
            units: 1
          }
        })
      ]);

      emitDeploymentUpdate(projectId, "ready", deploymentUrl);

      return {
        deploymentId: deployment.id,
        url: deploymentUrl,
        status: "ready"
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Deployment failed";

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "failed",
          logs: message
        }
      });

      emitDeploymentUpdate(projectId, "failed", null);
      throw error;
    }
  }

  async deployMobile(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });

    if (!project) {
      throw new Error("Project not found");
    }

    const payload = project.generatedCode as GeneratedProjectPayload | null;
    if (!payload?.files?.length) {
      throw new Error("Project has no generated files");
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        userId,
        platform: project.type === "ANDROID" ? "apk" : project.type === "IOS" ? "ipa" : "expo",
        status: "in_progress"
      }
    });

    emitDeploymentUpdate(projectId, "in_progress", null);

    try {
      const archivePath = await createZip(projectId, payload);
      const archiveName = path.basename(archivePath);
      const expoPreview = `https://expo.dev/@forge-ai/${projectId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(expoPreview);

      await prisma.$transaction([
        prisma.deployment.update({
          where: { id: deployment.id },
          data: {
            status: "ready",
            url: `/downloads/${archiveName}`,
            logs: "ZIP package created"
          }
        }),
        prisma.usageLog.create({
          data: {
            userId,
            projectId,
            type: "deployment_mobile",
            units: 1
          }
        })
      ]);

      emitDeploymentUpdate(projectId, "ready", `/downloads/${archiveName}`);

      return {
        deploymentId: deployment.id,
        status: "ready",
        downloadUrl: `/downloads/${archiveName}`,
        expoPreview,
        qrCodeDataUrl,
        buildCommand: "eas build --platform all"
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mobile packaging failed";

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "failed",
          logs: message
        }
      });

      emitDeploymentUpdate(projectId, "failed", null);
      throw error;
    }
  }

  async getDeploymentStatus(projectId: string, userId: string) {
    return prisma.deployment.findFirst({
      where: {
        projectId,
        userId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
}
