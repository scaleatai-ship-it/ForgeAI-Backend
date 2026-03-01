import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  billingInvoices,
  billingPortal,
  billingWebhook,
  createCheckout
} from "../controllers/billing.controller.js";

export const billingRouter = Router();

billingRouter.post("/webhook", asyncHandler(billingWebhook));
billingRouter.post("/create-checkout", requireAuth, asyncHandler(createCheckout));
billingRouter.post("/portal", requireAuth, asyncHandler(billingPortal));
billingRouter.get("/invoices", requireAuth, asyncHandler(billingInvoices));
