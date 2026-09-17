import "server-only";

import nodemailer from "nodemailer";

import { isMailReady } from "@/features/auth/server/environment";
import { SITE_NAME } from "@/lib/site-metadata";

export type AuthEmailKind = "verify" | "reset";

export interface AuthEmailInput {
  readonly kind: AuthEmailKind;
  readonly recipient: string;
  readonly url: string;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function smtpPort(): number {
  const configured = Number(process.env["SMTP_PORT"] ?? "465");
  return Number.isSafeInteger(configured) && configured > 0 && configured <= 65_535
    ? configured
    : 465;
}

function smtpSecure(port: number): boolean {
  const configured = process.env["SMTP_SECURE"]?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return port === 465;
}

export async function sendAuthEmail(input: AuthEmailInput): Promise<void> {
  if (!isMailReady()) {
    throw new Error("Authentication email is not configured.");
  }

  const port = smtpPort();
  const user = process.env["SMTP_USER"]!.trim();
  const password = process.env["SMTP_PASSWORD"]!.replace(/\s/g, "");
  const transport = nodemailer.createTransport({
    host: process.env["SMTP_HOST"]?.trim() || "smtp.gmail.com",
    port,
    secure: smtpSecure(port),
    auth: { user, pass: password },
  });
  const isVerification = input.kind === "verify";
  const subject = isVerification
    ? `Verify your ${SITE_NAME} email`
    : `Reset your ${SITE_NAME} password`;
  const action = isVerification ? "Verify email" : "Reset password";
  const explanation = isVerification
    ? `Use this link to verify your ${SITE_NAME} account.`
    : `Use this link to choose a new ${SITE_NAME} password.`;

  await transport.sendMail({
    from: { name: SITE_NAME, address: user },
    to: input.recipient,
    subject,
    text: `${explanation}\n\n${input.url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h1 style="font-size:22px">${SITE_NAME}</h1><p>${explanation}</p><p><a href="${escapeHtml(input.url)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#335cff;color:#fff;text-decoration:none;font-weight:700">${action}</a></p><p style="font-size:13px;color:#596273">If you did not request this, you can ignore this email.</p></div>`,
  });
}
