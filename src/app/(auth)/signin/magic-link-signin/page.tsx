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

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Magic Link Sign In",
  description: "Check your email for the magic link to sign in",
};

export default function MagicLinkSignInPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen w-full items-center justify-center flex-col">
      <Card className="max-sm:flex max-sm:h-screen max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:rounded-none max-sm:border-none sm:min-w-[370px] sm:max-w-[368px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Success!</CardTitle>
          <CardDescription>
            Check your email for the magic link to sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            aria-label="Back to the sign in page"
            href="/signin"
            className={buttonVariants()}
          >
            Go to Sign In page
          </Link>
        </CardContent>
      </Card>

      {/* <div className="fixed bottom-0 left-0 z-50 w-full bg-background px-4 py-6 shadow-lg sm:px-6 md:py-8 md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Cookie Consent</h3>
              <p className="text-muted-foreground">
                We use cookies to improve your experience on our website. By continuing to use our site, you agree to our
                use of cookies.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto">Accept</Button>
              <Button variant="link" className="w-full sm:w-auto">
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
