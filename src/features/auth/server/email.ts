import "server-only";

import nodemailer from "nodemailer";

import { isMailReady } from "@/features/auth/server/environment";
import { SITE_NAME } from "@/lib/site-metadata";

import { renderAuthEmail, type AuthEmailKind } from "./email-template";

export interface AuthEmailInput {
  readonly kind: AuthEmailKind;
  readonly recipient: string;
  readonly recipientName?: string | null;
  readonly url: string;
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
  const message = renderAuthEmail({
    kind: input.kind,
    recipientName: input.recipientName,
    siteName: SITE_NAME,
    url: input.url,
  });

  await transport.sendMail({
    from: { name: SITE_NAME, address: user },
    to: input.recipient,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
