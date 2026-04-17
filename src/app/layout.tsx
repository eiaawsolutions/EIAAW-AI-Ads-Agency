import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "EIAAW — Autonomous AI Ads Agency",
    template: "%s · EIAAW",
  },
  description:
    "A multi-agent AI organization that plans, launches, optimizes, and scales paid campaigns across Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, and Apple Ads.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "EIAAW — Autonomous AI Ads Agency",
    description: "Predictive, multi-platform, experiment-native paid advertising.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04201F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${sans.variable} ${mono.variable} font-sans`}>
        <Providers>{children}</Providers>
        <Toaster theme="dark" richColors position="bottom-right" />
      </body>
    </html>
  );
}
