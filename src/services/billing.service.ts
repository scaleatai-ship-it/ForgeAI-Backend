import Stripe from "stripe";
import { Plan } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

const planPriceMap: Record<Exclude<Plan, "FREE">, string> = {
  PRO: "price_pro_29",
  TEAM: "price_team_99",
  ENTERPRISE: "price_enterprise_custom"
};

export class BillingService {
  private stripe: Stripe | null;

  constructor() {
    this.stripe = env.STRIPE_SECRET_KEY
      ? new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-02-24.acacia"
        })
      : null;
  }

  async createCheckout(userId: string, plan: Plan) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    if (plan === Plan.FREE) {
      throw new Error("Free plan does not require checkout");
    }

    if (!this.stripe) {
      return {
        url: `${env.NEXT_PUBLIC_APP_URL}/billing?mockCheckout=true&plan=${plan}`
      };
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId }
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      success_url: `${env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      line_items: [
        {
          price: planPriceMap[plan],
          quantity: 1
        }
      ],
      metadata: {
        userId: user.id,
        plan
      }
    });

    return { url: session.url };
  }

  async createPortal(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!this.stripe) {
      return { url: `${env.NEXT_PUBLIC_APP_URL}/billing` };
    }

    if (!user?.stripeCustomerId) {
      throw new Error("Stripe customer not found");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/billing`
    });

    return { url: session.url };
  }

  async getInvoices(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!this.stripe || !user.stripeCustomerId) {
      return [
        {
          id: "local-invoice",
          amountPaid: 0,
          currency: "usd",
          status: user.subscription?.status ?? "paid",
          hostedInvoiceUrl: null,
          invoicePdf: null,
          createdAt: user.subscription?.createdAt ?? user.createdAt
        }
      ];
    }

    const invoices = await this.stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 25
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amountPaid: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      createdAt: new Date(invoice.created * 1000)
    }));
  }

  async handleWebhook(signature: string | undefined, payload: Buffer) {
    if (!this.stripe || !env.STRIPE_WEBHOOK_SECRET || !signature) {
      return { handled: false, message: "Webhook not configured" };
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = String(subscription.customer);
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });

      if (user) {
        const plan =
          subscription.items.data[0]?.price.nickname?.toUpperCase() === "TEAM"
            ? Plan.TEAM
            : subscription.items.data[0]?.price.nickname?.toUpperCase() === "ENTERPRISE"
              ? Plan.ENTERPRISE
              : Plan.PRO;

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: {
              plan,
              credits: plan === Plan.PRO ? 250 : plan === Plan.TEAM ? 1200 : 5000
            }
          }),
          prisma.subscription.upsert({
            where: { userId: user.id },
            update: {
              stripeSubId: subscription.id,
              plan,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            },
            create: {
              userId: user.id,
              stripeSubId: subscription.id,
              plan,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            }
          })
        ]);
      }
    }

    return { handled: true };
  }
}
