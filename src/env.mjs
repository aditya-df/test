import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    DATABASE_URL: z.string(),
    AUTH_SECRET: z.string(),
    GOOGLE_ID: z.string(),
    GOOGLE_SECRET: z.string(),
    GITHUB_ID: z.string(),
    GITHUB_SECRET: z.string(),
    NEXT_PUBLIC_BACKEND_API_URL: z.string().url(),
    REACT_SCAN: z.string(),
    USING_RECAPTCHA: z.string(),
    DATABASE_TYPE: z.string(),
    SMTP_SERVER_USERNAME: z.string(),
    SMTP_SERVER_PASSWORD: z.string(),
    SMTP_SERVER_HOST: z.string(),
    WEATHER_API_KEY: z.string(),
    RECAPTCHA_SECRET_KEY: z.string(),
    LOGIN_WITH_EMAIL: z.string(),
    LOGIN_WITH_MAGICLINK: z.string(),
    LOGIN_WITH_GITHUB: z.string(),
    LOGIN_WITH_GOOGLE: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL_V2: process.env.NEXT_PUBLIC_API_URL_V2,
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_ID: process.env.GOOGLE_ID,
    GOOGLE_SECRET: process.env.GOOGLE_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
    REACT_SCAN: process.env.REACT_SCAN,
    DATABASE_TYPE: process.env.DATABASE_TYPE,
    SMTP_SERVER_USERNAME: process.env.SMTP_SERVER_USERNAME,
    SMTP_SERVER_PASSWORD: process.env.SMTP_SERVER_PASSWORD,
    SMTP_SERVER_HOST: process.env.SMTP_SERVER_HOST,
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    USING_RECAPTCHA: process.env.USING_RECAPTCHA,
    LOGIN_WITH_EMAIL: process.env.LOGIN_WITH_EMAIL,
    LOGIN_WITH_MAGICLINK: process.env.LOGIN_WITH_MAGICLINK,
    LOGIN_WITH_GITHUB: process.env.LOGIN_WITH_GITHUB,
    LOGIN_WITH_GOOGLE: process.env.LOGIN_WITH_GOOGLE,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * This is especially useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
