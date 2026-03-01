import { prisma } from "../config/prisma.js";

export class DashboardService {
  async getStats(userId: string) {
    const [projectsCount, deploymentsCount, generations, user] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.deployment.count({ where: { userId, status: "ready" } }),
      prisma.generation.findMany({
        where: { userId, status: "success" },
        select: { durationMs: true },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { credits: true } })
    ]);

    const averageGenerationTime =
      generations.length > 0
        ? Math.round(generations.reduce((sum, item) => sum + item.durationMs, 0) / generations.length)
        : 0;

    return {
      totalProjects: projectsCount,
      creditsRemaining: user?.credits ?? 0,
      appsDeployed: deploymentsCount,
      generationTimeMs: averageGenerationTime
    };
  }

  async getUsage(userId: string) {
    const usageLogs = await prisma.usageLog.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    const byDate = usageLogs.reduce<Record<string, { date: string; generations: number; credits: number }>>(
      (accumulator, log) => {
        const key = log.createdAt.toISOString().slice(0, 10);
        if (!accumulator[key]) {
          accumulator[key] = { date: key, generations: 0, credits: 0 };
        }

        if (log.type.startsWith("generation")) {
          accumulator[key].generations += log.units;
        }

        accumulator[key].credits += log.units;
        return accumulator;
      },
      {}
    );

    return Object.values(byDate);
  }

  async getAdminStats() {
    const [users, generations, subscriptions, deployments, newUsersByDay] = await Promise.all([
      prisma.user.count(),
      prisma.generation.findMany({
        select: { status: true, createdAt: true }
      }),
      prisma.subscription.findMany({
        where: { status: "active" },
        select: { plan: true }
      }),
      prisma.project.groupBy({
        by: ["type"],
        _count: { _all: true }
      }),
      prisma.user.groupBy({
        by: ["createdAt"],
        _count: { _all: true }
      })
    ]);

    const successCount = generations.filter((generation) => generation.status === "success").length;
    const failureCount = generations.filter((generation) => generation.status === "failed").length;

    const planPriceMap: Record<string, number> = {
      FREE: 0,
      PRO: 29,
      TEAM: 99,
      ENTERPRISE: 299
    };

    const mrr = subscriptions.reduce((sum, subscription) => sum + (planPriceMap[subscription.plan] ?? 0), 0);

    return {
      users,
      mrr,
      generationSuccessRate:
        successCount + failureCount > 0
          ? Number(((successCount / (successCount + failureCount)) * 100).toFixed(2))
          : 0,
      generationFailureRate:
        successCount + failureCount > 0
          ? Number(((failureCount / (successCount + failureCount)) * 100).toFixed(2))
          : 0,
      appTypeDistribution: deployments,
      signupsByDay: newUsersByDay.map((entry) => ({
        date: entry.createdAt.toISOString().slice(0, 10),
        count: entry._count._all
      }))
    };
  }
}
