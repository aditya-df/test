import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/nodemailer";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { env } from "@/env.mjs";
import { signInWithPasswordSchema } from "@/validations/auth";
import bcryptjs from "bcryptjs";

import { generateMagicLinkEmailHtml } from "@/template/emails/magic-link-email";
import { getUserByEmail } from "@/services/user";
import { sendMail } from "@/utils/send-email";

class InvalidLoginError extends CredentialsSignin {
  message = "Invalid captcha";
}

async function verifyCaptcha(token: string) {
  const res = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    { method: "POST" }
  );
  const data = await res.json();
  return data.success;
}

export default {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_ID,
      clientSecret: env.GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      async profile(profile) {
        // Customize Google profile data if needed
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.readonly",
        },
      },
    }),
    GitHubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      async authorize(rawCredentials) {
        const attempts = parseInt((rawCredentials?.attempts as string) || "0");

        // If attempts >= 3, require captcha verification
        if (env.USING_RECAPTCHA == "true" && attempts >= 3) {
          const captchaToken = rawCredentials?.captcha as string;
          if (!captchaToken || !(await verifyCaptcha(captchaToken))) {
            throw new InvalidLoginError();
          }
        }

        const validatedCredentials =
          signInWithPasswordSchema.safeParse(rawCredentials);

        if (validatedCredentials.success) {
          const user = await getUserByEmail({
            email: validatedCredentials.data.email,
          });
          if (!user || !user.passwordHash) return null;

          const passwordIsValid = await bcryptjs.compare(
            validatedCredentials.data.password,
            user.passwordHash
          );

          if (passwordIsValid) {
            const result = await fetch(
              `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/user/login`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: validatedCredentials.data.email,
                  password: validatedCredentials.data.password,
                }),
              }
            );
            const data = await result.json();
            return {
              ...user,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            };
          }
        }
        return null;
      },
    }),

    EmailProvider({
      id: "email",
      name: "Email",
      server: {
        host: env.SMTP_SERVER_HOST,
        port: 587,
        secure: false, // Important: false for port 587
        auth: {
          user: env.SMTP_SERVER_USERNAME,
          pass: env.SMTP_SERVER_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      },
      from: "Knowgen.AI <knowgen.ai@gmail.com>",
      maxAge: 24 * 60 * 60, // 24 hours
      async sendVerificationRequest({
        identifier,
        url,
        provider,
      }: {
        identifier: string;
        url: string;
        provider: any;
      }) {
        try {
          await sendMail({
            email: provider.from,
            sendTo: identifier,
            subject: "Knowgen.AI magic link sign in",
            body: generateMagicLinkEmailHtml({ identifier, url }),
          });
        } catch (err) {
          console.error(`❌ Failed to send magic link to ${identifier}:`, err);
          // Re-throw the error so NextAuth knows it failed
          throw new Error(
            `Email verification failed: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
