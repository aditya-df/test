"use server";

import crypto from "crypto";
import { getUserByEmail, getUserByResetPasswordToken } from "@/services/user";
import { signIn } from "@/auth.config";
import {
  linkOAuthAccountSchema,
  passwordResetSchema,
  passwordUpdateSchemaExtended,
  signInWithPasswordSchema,
  signUpWithPasswordSchema,
  type LinkOAuthAccountInput,
  type PasswordResetFormInput,
  type PasswordUpdateFormInputExtended,
  type SignInWithPasswordFormInput,
  type SignUpWithPasswordFormInput,
} from "@/validations/auth";
import bcryptjs from "bcryptjs";

import { prisma } from "@/config/db";
// import { resend } from "@/config/email"
import { EmailVerificationEmailHtml } from "@/template/emails/email-verification-email";
import { generateResetPasswordEmailHtml } from "@/template/emails/reset-password-email";
import { sendMail } from "@/utils/send-email";
import { generateResetPasswordEmailFromAdminHtml } from "@/template/emails/from-admin-reset-password-email";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { AuditAction, createAuditLog } from "@/lib/audit-log";

export async function signUpWithPassword(
  rawInput: SignUpWithPasswordFormInput
): Promise<"invalid-input" | "exists" | "error" | "success"> {
  try {
    const validatedInput = signUpWithPasswordSchema.safeParse(rawInput);
    if (!validatedInput.success) return "invalid-input";

    const user = await getUserByEmail({ email: validatedInput.data.email });
    if (user) return "exists";

    const passwordHash = await bcryptjs.hash(validatedInput.data.password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString("base64url");

    const newUser = await prisma.user.create({
      data: {
        email: validatedInput.data.email,
        passwordHash,
        emailVerificationToken,
      },
    });

    // Log account creation to audit logs
    try {
      const headersList = await headers();
      const forwarded = headersList.get('x-forwarded-for');
      const real = headersList.get('x-real-ip');
      const clientIP = forwarded?.split(',')[0] || real || 'unknown';
      const userAgent = headersList.get('user-agent') || 'unknown';

      await createAuditLog({
        userId: newUser.id,
        userEmail: newUser.email || 'unknown',
        userName: newUser.name || 'Unknown User',
        action: AuditAction.ACCOUNT_CREATED,
        ipAddress: clientIP,
        userAgent: userAgent,
        details: {
          registrationType: 'email',
          emailVerificationRequired: true,
        },
        success: true,
      });
    } catch (auditError) {
      console.error('Failed to create audit log for regular signup:', auditError);
    }

    // const emailSent = await resend.emails.send({
    //   from: env.RESEND_EMAIL_FROM,
    //   to: [validatedInput.data.email],
    //   subject: "Verify your email address",
    //   react: EmailVerificationEmail({
    //     email: validatedInput.data.email,
    //     emailVerificationToken,
    //   }),
    // })

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
        err
      );
      emailSent = false;
    }

    return newUser && emailSent ? "success" : "error";
  } catch (error) {
    console.error(error);
    throw new Error("Error signing up with password");
  }
}

export async function signInWithPassword(
  rawInput: SignInWithPasswordFormInput & {
    captchaToken: string;
    attempts: string;
  }
): Promise<
  | "invalid-input"
  | "invalid-credentials"
  | "invalid-captcha"
  | "not-registered"
  | "unverified-email"
  | "incorrect-provider"
  | "success"
  | "unverified-byadmin"
> {
  try {
    const validatedInput = signInWithPasswordSchema.safeParse(rawInput);
    if (!validatedInput.success) return "invalid-input";

    const existingUser = await getUserByEmail({
      email: validatedInput.data.email,
    });
    if (!existingUser) return "not-registered";

    if (!existingUser.email || !existingUser.passwordHash)
      return "incorrect-provider";

    if (!existingUser.emailVerified) return "unverified-email";

    if (existingUser.onboardingCompleted) {
      if (!existingUser.isVerified) return "unverified-byadmin";
    }

    await signIn("credentials", {
      email: validatedInput.data.email,
      password: validatedInput.data.password,
      captcha: rawInput.captchaToken,
      attempts: rawInput.attempts.toString(),
      redirect: false,
    });

    return "success";
  } catch (error) {
    console.error(error);
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          if (error.message === "Invalid captcha") return "invalid-captcha";
          return "invalid-credentials";
        default:
          throw error;
      }
    } else {
      throw new Error("Error signin in with password");
    }
  }
}

export async function resetPassword(
  rawInput: PasswordResetFormInput
): Promise<"invalid-input" | "not-found" | "error" | "success"> {
  try {
    const validatedInput = passwordResetSchema.safeParse(rawInput);
    if (!validatedInput.success) return "invalid-input";

    const user = await getUserByEmail({ email: validatedInput.data.email });
    if (!user) return "not-found";

    const today = new Date();
    const resetPasswordToken = crypto.randomBytes(32).toString("base64url");
    const resetPasswordTokenExpiry = new Date(
      today.setDate(today.getDate() + 1)
    ); // 24 hours from now

    const userUpdated = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        resetPasswordToken,
        resetPasswordTokenExpiry,
      },
    });

    // const emailSent = await resend.emails.send({
    //   from: env.RESEND_EMAIL_FROM,
    //   to: [validatedInput.data.email],
    //   subject: "Reset your password",
    //   react: ResetPasswordEmail({
    //     email: validatedInput.data.email,
    //     resetPasswordToken,
    //   }),
    // })

    let emailSent = false;

    try {
      await sendMail({
        email: "Knowgen.AI <knowgen.ai@gmail.com>",
        sendTo: validatedInput.data.email,
        subject: "Knowgen.AI - Reset your password",
        body: generateResetPasswordEmailHtml({
          email: validatedInput.data.email,
          resetPasswordToken,
        }),
      });
      emailSent = true;
    } catch (err) {
      console.error(
        `Failed to send email to ${validatedInput.data.email}:`,
        err
      );
      emailSent = false;
    }

    return userUpdated && emailSent ? "success" : "error";
  } catch (error) {
    console.error(error);
    return "error";
  }
}

export async function adminResetUserPassword(
  userId: string
): Promise<"not-found" | "error" | "success"> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return "not-found";

    const today = new Date();
    const resetPasswordToken = crypto.randomBytes(32).toString("base64url");
    const resetPasswordTokenExpiry = new Date(
      today.setDate(today.getDate() + 1)
    ); // 24 hours from now

    const userUpdated = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        resetPasswordToken,
        resetPasswordTokenExpiry,
      },
    });

    if (!user.email) return "error";

    let emailSent = false;

    try {
      await sendMail({
        email: "Knowgen.AI <knowgen.ai@gmail.com>",
        sendTo: user.email,
        subject: "Knowgen.AI - Reset your password",
        body: generateResetPasswordEmailFromAdminHtml({
          email: user.email,
          resetPasswordToken,
        }),
      });
      emailSent = true;
    } catch (err) {
      console.error(`Failed to send email to ${user.email}:`, err);
      emailSent = false;
    }

    return userUpdated && emailSent ? "success" : "error";
  } catch (error) {
    console.error(error);
    return "error";
  }
}

export async function updatePassword(
  rawInput: PasswordUpdateFormInputExtended
): Promise<"invalid-input" | "not-found" | "expired" | "error" | "success"> {
  try {
    const validatedInput = passwordUpdateSchemaExtended.safeParse(rawInput);
    if (
      !validatedInput.success ||
      validatedInput.data.password !== validatedInput.data.confirmPassword
    )
      return "invalid-input";

    const user = await getUserByResetPasswordToken({
      token: validatedInput.data.resetPasswordToken,
    });
    if (!user) return "not-found";

    const resetPasswordExpiry = user.resetPasswordTokenExpiry;
    if (!resetPasswordExpiry || resetPasswordExpiry < new Date())
      return "expired";

    const passwordHash = await bcryptjs.hash(validatedInput.data.password, 10);

    const userUpdated = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
      },
    });

    return userUpdated ? "success" : "error";
  } catch (error) {
    console.error(error);
    throw new Error("Error updating password");
  }
}

export async function linkOAuthAccount(
  rawInput: LinkOAuthAccountInput
): Promise<void> {
  try {
    const validatedInput = linkOAuthAccountSchema.safeParse(rawInput);
    if (!validatedInput.success) return;

    await prisma.user.update({
      where: {
        id: validatedInput.data.userId,
      },
      data: {
        emailVerified: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    throw new Error("Error linking OAuth account");
  }
}
