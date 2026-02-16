import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/app/i18n/provider";
import "./globals.css";
import { MonitoringProvider } from "./components/MonitoringProvider";
import { BehavioralWarningProvider } from "./components/BehavioralWarningProvider";
import { MLProvider } from "./components/MLProvider";
import { ThemeProvider } from "./components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

// Viewport設定（Next.js 13+で分離）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#101922",
};

export const metadata: Metadata = {
  title: "Trader Pro - 株式取引予測プラットフォーム",
  description: "AI予測シグナルとテクニカル分析を活用した株式取引支援プラットフォーム",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Trader Pro",
  },
  other: {
    "format-detection": "telephone=no",
  },
};

import { Navigation } from "@/app/components/Navigation";
import { UserExperienceEnhancements } from "@/app/components/UserExperienceEnhancements";
import { StoreHydration } from "@/app/components/StoreHydration";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://query1.finance.yahoo.com" />
        <link rel="preconnect" href="https://query2.finance.yahoo.com" />
        <link rel="dns-prefetch" href="https://query1.finance.yahoo.com" />
        
        {/* Critical CSS inline */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html { background-color: #101922; }
            body { 
              margin: 0; 
              font-family: var(--font-inter), system-ui, -apple-system, sans-serif;
              background-color: #101922;
              color: white;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            /* Prevent FOUC */
            .dark { color-scheme: dark; }
          `
        }} />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/favicon.ico" as="image" type="image/x-icon" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <MLProvider>
            <MonitoringProvider>
              <BehavioralWarningProvider>
                <I18nProvider>
                  <StoreHydration />
                  <div className="flex flex-col h-screen overflow-hidden bg-[#101922]">
                    <div className="flex-1 overflow-hidden relative">
                      {children}
                    </div>
                    <Navigation />
                    <UserExperienceEnhancements />
                  </div>
                </I18nProvider>
              </BehavioralWarningProvider>
            </MonitoringProvider>
          </MLProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
