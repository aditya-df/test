"use server";

import nodemailer from "nodemailer";
import { env } from "@/env.mjs";

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: env.SMTP_SERVER_HOST,
  port: 587,
  secure: false,
  auth: {
    user: env.SMTP_SERVER_USERNAME,
    pass: env.SMTP_SERVER_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// ✨ NEW: Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000; // 2 seconds

interface SendMailParams {
  email: string;
  sendTo?: string;
  subject: string;
  body: string;
}

// ✨ NEW: Original sendMail function (internal use only)
async function sendMailInternal({
  email,
  sendTo,
  subject,
  body,
}: SendMailParams) {
  const isVerified = await transporter.verify();

  if (!isVerified) {
    throw new Error("SMTP transporter verification failed");
  }

  const info = await transporter.sendMail({
    from: email,
    to: sendTo,
    subject: subject,
    html: body,
  });

  return info;
}

// ✨ NEW: Retry logic with exponential backoff
async function sendMailWithRetry(
  params: SendMailParams,
  retryCount = 0
): Promise<any> {
  try {
    return await sendMailInternal(params);
  } catch (error: any) {
    const isRateLimitError =
      error?.responseCode === 421 ||
      error?.code === 'EENVELOPE' ||
      error?.message?.includes('421') ||
      error?.message?.includes('Temporary System Problem');

    if (isRateLimitError && retryCount < MAX_RETRIES) {
      // Exponential backoff: 2s, 4s, 8s
      const delay = INITIAL_DELAY * Math.pow(2, retryCount);

      console.log(
        `⚠️ Rate limit hit for ${params.sendTo}. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return sendMailWithRetry(params, retryCount + 1);
    }

    // If not rate limit or max retries reached, throw error
    console.error("❌ Email sending failed:", {
      host: env.SMTP_SERVER_HOST,
      username: env.SMTP_SERVER_USERNAME,
      hasPassword: !!env.SMTP_SERVER_PASSWORD,
      error: error,
      retriesAttempted: retryCount
    });

    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ✨ MODIFIED: Export function with retry logic
export async function sendMail(params: SendMailParams) {
  return sendMailWithRetry(params);
}