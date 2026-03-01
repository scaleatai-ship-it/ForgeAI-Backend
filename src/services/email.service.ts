import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type PasswordResetEmailInput = {
  to: string;
  name?: string | null;
  resetUrl: string;
};

export class EmailService {
  private transporter =
    env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
      ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        })
      : null;

  async sendPasswordReset(input: PasswordResetEmailInput) {
    const subject = "Forge AI password reset";
    const greeting = input.name ? `Hi ${input.name},` : "Hi,";
    const text = `${greeting}\n\nReset your password using this link:\n${input.resetUrl}\n\nThe link expires in 1 hour.`;

    if (!this.transporter) {
      console.log("[email-disabled] password reset", { to: input.to, resetUrl: input.resetUrl });
      return { sent: false };
    }

    await this.transporter.sendMail({
      from: env.SMTP_FROM ?? "forge-ai@example.com",
      to: input.to,
      subject,
      text,
      html: `
        <p>${greeting}</p>
        <p>Reset your Forge AI password by clicking the button below:</p>
        <p><a href="${input.resetUrl}" style="display:inline-block;padding:10px 14px;background:#6366F1;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
        <p>If the button does not work, paste this URL into your browser:</p>
        <p>${input.resetUrl}</p>
        <p>This link expires in 1 hour.</p>
      `
    });

    return { sent: true };
  }
}
