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

interface MagicLinkEmailProps {
  identifier: string;
  url: string;
}

export function generateMagicLinkEmailHtml({
  identifier,
  url,
}: MagicLinkEmailProps): string {
  const previewText = `${siteConfig.name} magic link sign in.`;
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${previewText}</title>
      </head>
      <body>
        <div>
          <h1>Hi,</h1>
          <p>Someone just requested a Sign In magic link for ${identifier}</p>
          <p>If this was you, you can sign in here:</p>
          <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:#ffffff;text-decoration:none;">Sign in</a>
          <p>If you didn't try to login, you can safely ignore this email.</p>
          <p>
            Enjoy <span style="font-weight:bold;">${siteConfig.name}</span> and have a nice day!
          </p>
          <p style="font-size:12px;">
            Hint: You can set a permanent password in Dashboard → Settings
          </p>
        </div>
      </body>
    </html>
  `;
}

export function MagicLinkEmail({
  identifier,
  url,
}: MagicLinkEmailProps): React.ReactElement {
  const previewText = `${siteConfig.name} magic link sign in.`;
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
              <Text>Hi,</Text>
              <Text>
                Someone just requested a Sign In magic link for {identifier}
              </Text>
              <Text>If this was you, you can sign in here:</Text>
              <Button href={url}>Sign in</Button>
            </Section>
            <Section>
              <Text>
                If you didn&apos;t try to login, you can safely ignore this
                email.
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
            <Section>
              <Text className="text-xs">
                Hint: You can set a permanent password in Dashboard → Settings
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
