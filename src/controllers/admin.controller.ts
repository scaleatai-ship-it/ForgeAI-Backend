import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

export async function recentSignups(_request: Request, response: Response) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      createdAt: true
    }
  });

  response.json({ users });
}
