import type { Plan } from "@prisma/client";

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      email: string;
      plan: Plan;
      isAdmin: boolean;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
