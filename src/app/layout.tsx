import "@/styles/globals.css";

import * as React from "react";
import type { Metadata, Viewport } from "next";
import { env } from "@/env.mjs";
import NextTopLoader from "nextjs-toploader";
// import { Analytics } from '@vercel/analytics/react'

import { Toaster } from "@/components/ui/toaster";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { ReactScan } from "@/components/react-scan";
import { FontLoader } from "@/components/font-loader";
import { PageLoadingSpinner } from "@/components/page-loading-spinner";
import TrialBanner from "@/components/TrialBanner";

import { fontHeading, fontInter, fontUrbanist } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/utils";

import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { StateProviders } from "@/providers/state-providers";
// import { SmoothScrollProvider } from '@/providers/smooth-scroll-provider'

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // authors: [
  //   {
  //     name: siteConfig.author,
  //     url: siteConfig.links.authorsWebsite,
  //   },
  // ],
  // creator: siteConfig.author,
  // keywords: siteConfig.keywords,

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: siteConfig.author,
  },
  icons: {
    icon: "/km/favicon/favicon.ico",
  },
  // manifest: `${siteConfig.url}/site.webmanifest`,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps): React.ReactElement {
  return (
    <html
      lang="en"
      className="overflow-x-hidden overflow-y-scroll"
      suppressHydrationWarning
    >
      <head>
        <meta httpEquiv="Cross-Origin-Opener-Policy" content="same-origin" />
        <FontLoader />
      </head>
      {env.REACT_SCAN === "true" && <ReactScan />}
      <body
        className={cn(
          "w-full bg-background bg-linear-to-r from-background to-orange-400/10 font-sans antialiased",
          fontInter.variable,
          fontUrbanist.variable,
          fontHeading.variable,
        )}
      >
        <StateProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="white"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              {/* <SmoothScrollProvider> */}
              {/* NextTopLoader for the top progress bar */}
              <NextTopLoader
                color="#2563eb"
                initialPosition={0.08}
                crawlSpeed={200}
                height={3}
                crawl={true}
                showSpinner={false}
                easing="ease"
                speed={200}
              />

              {/* PageLoadingSpinner for a centered spinner during longer loads */}
              <PageLoadingSpinner
                variant="claude"
                position="center"
                delay={300}
              />
              <TrialBanner />
              {children}
              {/* </SmoothScrollProvider> */}
              <Toaster />
            </AuthProvider>
            <TailwindIndicator />
          </ThemeProvider>
        </StateProviders>
      </body>
    </html>
  );
}
