import { env } from "@/env.mjs";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { siteConfig } from "@/config/site";

interface EmailVerificationEmailProps {
  email: string;
  emailVerificationToken: string;
}

export function EmailVerificationEmailHtml({
  email,
  emailVerificationToken,
}: EmailVerificationEmailProps): string {
  const previewText = `${siteConfig.name} email verification.`;
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${previewText}</title>
      </head>
      <body>
        <div>
          <h1>Hi,</h1>
          <p>Your email address, ${email}, was recently used to sign up at ${siteConfig.name}.</p>
          <p>Please verify this address by clicking the button below</p>
          <a href="${env.NEXT_PUBLIC_BACKEND_API_URL}/signup/verify-email?token=${emailVerificationToken}">
            Verify email now
          </a>
          <p>If you didn't sign up at ${siteConfig.name}, just ignore and delete this message.</p>
          <p>Enjoy ${siteConfig.name} and have a nice day!</p>
        </div>
      </body>
    </html>
  `;
}

export function EmailVerificationEmail({
  email,
  emailVerificationToken,
}: Readonly<EmailVerificationEmailProps>): React.ReactElement {
  const previewText = `${siteConfig.name} email verification.`;
  return (
    <Html lang="en">
      <Head>
        <title>{previewText}</title>
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body>
          <Container>
            <Section>
              <Text className="text-xl">Hi,</Text>
              <Text className="text-base">
                Your email address, {email}, was recently used to sign up at{" "}
                <span className="font-semibold tracking-wide">
                  {siteConfig.name}
                </span>
                .
              </Text>
              <Text className="text-base">
                Please verify this address by clicking the button below
              </Text>
              <Button
                href={`${env.NEXT_PUBLIC_APP_URL}/signup/verify-email?token=${emailVerificationToken}`}
              >
                Verify email now
              </Button>
            </Section>

            <Section>
              <Text className="text-xs">
                If you didn&apos;t sign up at {siteConfig.name}, just ignore and
                delete this message.
              </Text>
              <Text className="text-base font-medium">
                Enjoy{" "}
                <span className="font-semibold tracking-wide">
                  {siteConfig.name}
                </span>{" "}
                and have a nice day!
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
