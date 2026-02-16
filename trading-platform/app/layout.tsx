import type { Metadata } from "next";
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
});

export const metadata: Metadata = {
  title: "Trader Pro - 株式取引予測プラットフォーム",
  description: "AI予測シグナルとテクニカル分析を活用した株式取引支援プラットフォーム",
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