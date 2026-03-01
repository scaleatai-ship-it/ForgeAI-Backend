import { z } from "zod";
import type { Request, Response } from "express";
import { Plan } from "@prisma/client";
import { BillingService } from "../services/billing.service.js";

const billingService = new BillingService();

const checkoutSchema = z.object({
  plan: z.nativeEnum(Plan)
});

export async function createCheckout(request: Request, response: Response) {
  const payload = checkoutSchema.parse(request.body);
  const result = await billingService.createCheckout(request.user!.id, payload.plan);
  response.json(result);
}

export async function billingPortal(request: Request, response: Response) {
  const result = await billingService.createPortal(request.user!.id);
  response.json(result);
}

export async function billingInvoices(request: Request, response: Response) {
  const invoices = await billingService.getInvoices(request.user!.id);
  response.json({ invoices });
}

export async function billingWebhook(request: Request, response: Response) {
  const signature = request.headers["stripe-signature"] as string | undefined;
  const payload = request.body as Buffer;
  const result = await billingService.handleWebhook(signature, payload);
  response.json(result);
}
