import { type Metadata } from "next";
import Link from "next/link";
import { env } from "@/env.mjs";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordResetForm } from "@/components/forms/password-reset-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Password Reset",
  description: "Provide your email address to receive a reset link",
};

export default function PasswordReset(): React.ReactElement {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Card className="max-sm:flex max-sm:h-screen max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:justify-center sm:min-w-[370px] sm:max-w-[368px] border-none shadow-none bg-white dark:bg-gray-900">
        <CardHeader>
          <div className="flex items-center justify-between gap-x-2">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Password Reset</CardTitle>
              <CardDescription>
                Enter your email to receive a reset link
              </CardDescription>
            </div>
            <ThemeToggle />
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <PasswordResetForm />
          <Link
            aria-label="Back to the sign in page"
            href="/signin"
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
