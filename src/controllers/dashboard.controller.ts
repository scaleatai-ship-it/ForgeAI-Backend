import type { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service.js";

const dashboardService = new DashboardService();

export async function dashboardStats(request: Request, response: Response) {
  const stats = await dashboardService.getStats(request.user!.id);
  response.json({ stats });
}

export async function dashboardUsage(request: Request, response: Response) {
  const usage = await dashboardService.getUsage(request.user!.id);
  response.json({ usage });
}

export async function adminStats(_request: Request, response: Response) {
  const stats = await dashboardService.getAdminStats();
  response.json({ stats });
}
