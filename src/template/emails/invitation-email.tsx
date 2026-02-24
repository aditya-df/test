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

interface EmailInvitationProps {
  email: string;
  invitationToken: string;
}

export function EmailInvitationEmailHtml({
  email,
  invitationToken,
}: EmailInvitationProps): string {
  const previewText = `${siteConfig.name} email invitation.`;
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${previewText}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header p {
            margin: 8px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .welcome-message {
            background-color: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 0 0 30px 0;
            border-radius: 0 8px 8px 0;
          }
          .welcome-message h2 {
            margin: 0 0 10px 0;
            color: #1e40af;
            font-size: 20px;
            font-weight: 600;
          }
          .welcome-message p {
            margin: 0;
            color: #1e40af;
            font-size: 16px;
          }
          .invitation-details {
            background-color: #fafafa;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
            border: 1px solid #e5e7eb;
          }
          .invitation-details h3 {
            margin: 0 0 15px 0;
            color: #374151;
            font-size: 18px;
            font-weight: 600;
          }
          .invitation-details p {
            margin: 8px 0;
            color: #6b7280;
            font-size: 14px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
            margin: 20px 0;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          }
          .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 5px 0;
            color: #6b7280;
            font-size: 14px;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e5e7eb, transparent);
            margin: 30px 0;
          }
          .icon {
            display: inline-block;
            width: 24px;
            height: 24px;
            margin-right: 8px;
            vertical-align: middle;
          }
          @media only screen and (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }
            .header, .content, .footer {
              padding: 25px 20px;
            }
            .header h1 {
              font-size: 24px;
            }
            .cta-button {
              display: block;
              width: 100%;
              box-sizing: border-box;
            }
          }
        </style>
      </head>
      <body>
        <div style="padding: 20px 0;">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>🎉 You're Invited!</h1>
              <p>Join our team at ${siteConfig.name}</p>
            </div>
            
            <!-- Main Content -->
            <div class="content">
              <!-- Welcome Message -->
              <div class="welcome-message">
                <h2>👋 Hello there!</h2>
                <p>Great news! You've been invited to join our organization.</p>
              </div>
              
              <!-- Invitation Details -->
              <div class="invitation-details">
                <h3>📧 Invitation Details</h3>
                <p><strong>Email Address:</strong> ${email}</p>
                <p><strong>Organization:</strong> ${siteConfig.name}</p>
                <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">Pending Acceptance</span></p>
              </div>
              
              <p style="font-size: 16px; color: #374151; margin: 25px 0;">
                We're excited to have you join our team! Click the button below to accept your invitation and complete your registration.
              </p>
              
              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${env.NEXT_PUBLIC_APP_URL}/invitation?token=${invitationToken}" class="cta-button">
                  ✨ Accept Invitation & Join Now
                </a>
              </div>
              
              <!-- Divider -->
              <div class="divider"></div>
              
              <!-- Additional Information -->
              <div style="background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">
                  🔒 Secure Invitation
                </h4>
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  This invitation is secure and personalized for your email address. 
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
              
              <!-- Alternative Link -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
                  <strong>Having trouble with the button?</strong>
                </p>
                <p style="margin: 0; font-size: 14px; color: #64748b;">
                  Copy and paste this link into your browser:
                </p>
                <p style="margin: 10px 0 0 0; word-break: break-all; font-size: 12px; color: #3b82f6; font-family: monospace; background-color: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
                  ${env.NEXT_PUBLIC_APP_URL}/invitation?token=${invitationToken}
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p style="font-size: 16px; color: #374151; font-weight: 600; margin-bottom: 15px;">
                🚀 Welcome to ${siteConfig.name}!
              </p>
              <p>We're thrilled to have you join our community.</p>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af;">
                  © ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.
                </p>
                <p style="font-size: 12px; color: #9ca3af;">
                  This invitation was sent to ${email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function EmailInvitationEmail({
  email,
  invitationToken,
}: Readonly<EmailInvitationProps>): React.ReactElement {
  const previewText = `${siteConfig.name} email invitation.`;
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
                Your email address, {email}, was recently invited to join an
                organization at{" "}
                <span className="font-semibold tracking-wide">
                  {siteConfig.name}
                </span>
                .
              </Text>
              <Text className="text-base">
                Please confirm your response by clicking the button below
              </Text>
              <Button
                href={`${env.NEXT_PUBLIC_APP_URL}/onboarding?token=${invitationToken}`}
              >
                Accept & Join
              </Button>
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
