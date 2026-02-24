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
import { absoluteUrl } from "@/utils/utils";

interface ResetPasswordEmailProps {
  email: string;
  resetPasswordToken: string;
}

export function generateResetPasswordEmailFromAdminHtml({
  email,
  resetPasswordToken,
}: ResetPasswordEmailProps): string {
  const previewText = `${siteConfig.name} - Administrative Password Reset Notice`;
  return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>${previewText}</title>
        </head>
        <body>
          <div>
            <h1>Administrative Password Reset Notice</h1>
            <p>Dear ${siteConfig.name} User,</p>
            <p>Our administrative team has initiated a password reset for your account (${email}). This is a security measure to ensure the continued protection of your account.</p>
            <p>Please click the button below to set up your new password:</p>
            <a href="${absoluteUrl(`/signin/password-update?token=${resetPasswordToken}`)}">
              Set New Password
            </a>
            <p>For security reasons, this link will expire in 24 hours. If you have any questions or concerns, please contact our support team.</p>
            <p>Best regards,</p>
            <p>The ${siteConfig.name} Administrative Team</p>
          </div>
        </body>
      </html>
    `;
}

export function ResetPasswordEmail({
  email,
  resetPasswordToken,
}: Readonly<ResetPasswordEmailProps>): React.ReactElement {
  const previewText = `${siteConfig.name} password reset.`;

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
                Someone just requested a password change for your{" "}
                {siteConfig.name}
                account associated with {email}.
              </Text>
              <Text className="text-base">
                If this was you, you can set a new password here:
              </Text>
              <Button
                href={absoluteUrl(
                  `/signin/password-update?token=${resetPasswordToken}`,
                )}
              >
                Set new password
              </Button>
            </Section>
            <Section>
              <Text className="text-xs">
                If you don&apos;t want to change your password or didn&apos;t
                request this, just ignore and delete this message.
              </Text>
              <Text className="text-xs">
                To keep your account secure, please don&apos;t forward this
                email to anyone.
              </Text>
            </Section>
            <Section>
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
