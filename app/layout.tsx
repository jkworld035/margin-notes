import type { Metadata } from "next";
import { Lora, Outfit } from "next/font/google";
import "./globals.css";
import Header from "./header";
import { Analytics } from "@vercel/analytics/next";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jkworld035 — Margin Notes",
    template: "%s",
  },
  description: "Read, write, and discover long-form essays.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${outfit.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('marginNotesTheme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  );
}