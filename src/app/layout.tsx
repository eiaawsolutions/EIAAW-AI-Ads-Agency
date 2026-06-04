import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

// Estate-wide Meta (Facebook) Pixel — same business pixel as the parent
// eiaawsolutions.com site and the sa/smt/ep subdomains. Base PageView only;
// conversion events can be wired to CTAs later. App Router idiomatic install:
// next/script (afterInteractive) for the loader, raw <noscript> beacon fallback.
const META_PIXEL_ID = "1516303113491153";

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
  themeColor: "#FAF7F2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </head>
      <body className={`${sans.variable} ${mono.variable} font-sans`}>
        <Providers>{children}</Providers>
        <Toaster theme="light" richColors position="bottom-right" />
      </body>
    </html>
  );
}
