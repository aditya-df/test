import { Inter, Urbanist } from "next/font/google";
import localFont from "next/font/local";

export const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const fontUrbanist = Urbanist({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '700', '800'], // Include only weights you use
  variable: '--font-urbanist',
});

export const fontHeading = localFont({
  src: "../../public/fonts/cal-sans-semi-bold.woff2",
  variable: "--font-heading",
  display: 'swap',
  preload: true,
});
