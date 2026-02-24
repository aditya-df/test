"use server";

import crypto from "crypto";

import {
  checkIfEmailVerifiedSchema,
  emailVerificationSchema,
  markEmailAsVerifiedSchema,
  type CheckIfEmailVerifiedInput,
  type EmailVerificationFormInput,
  type MarkEmailAsVerifiedInput,
} from "@/validations/email";

import { prisma } from "@/config/db";
// import { resend } from "@/config/email"
import { sendMail } from "@/utils/send-email";
import { EmailVerificationEmailHtml } from "@/template/emails/email-verification-email";
import { getUserByEmail } from "./user";

export async function resendEmailVerificationLink(
  rawInput: EmailVerificationFormInput,
): Promise<"invalid-input" | "not-found" | "error" | "success"> {
  try {
    const validatedInput = emailVerificationSchema.safeParse(rawInput);
    if (!validatedInput.success) return "invalid-input";

    const user = await getUserByEmail({ email: validatedInput.data.email });
    if (!user) return "not-found";

    const emailVerificationToken = crypto.randomBytes(32).toString("base64url");

    const userUpdated = await prisma.user.update({
      where: {
        email: validatedInput.data.email,
      },
      data: {
        emailVerificationToken,
      },
    });

    let emailSent = false;

    try {
      await sendMail({
        email: "Knowgen.AI <knowgen.ai@gmail.com>",
        sendTo: validatedInput.data.email,
        subject: "Knowgen.AI - Verify your email address",
        body: EmailVerificationEmailHtml({
          email: validatedInput.data.email,
          emailVerificationToken,
        }),
      });
      emailSent = true;
    } catch (err) {
      console.error(
        `Failed to send email to ${validatedInput.data.email}:`,
        err,
      );
      emailSent = false;
    }

    return userUpdated && emailSent ? "success" : "error";
  } catch (error) {
    console.error(error);
    throw new Error("Error resending email verification link");
  }
}

export async function checkIfEmailVerified(
  rawInput: CheckIfEmailVerifiedInput,
): Promise<boolean> {
  try {
    const validatedInput = checkIfEmailVerifiedSchema.safeParse(rawInput);
    if (!validatedInput.success) return false;

    const user = await getUserByEmail({ email: validatedInput.data.email });
    return user?.emailVerified instanceof Date ? true : false;
  } catch (error) {
    console.error(error);
    throw new Error("Error checking if email verified");
  }
}

export async function markEmailAsVerified(
  rawInput: MarkEmailAsVerifiedInput,
): Promise<"invalid-input" | "error" | "success"> {
  try {
    const validatedInput = markEmailAsVerifiedSchema.safeParse(rawInput);
    if (!validatedInput.success) return "invalid-input";

    const userUpdated = await prisma.user.update({
      where: {
        emailVerificationToken: validatedInput.data.token,
      },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
      },
    });

    return userUpdated ? "success" : "error";
  } catch (error) {
    console.error(error);
    throw new Error("Error marking email as verified");
  }
}
