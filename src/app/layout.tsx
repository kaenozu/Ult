import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Sidebar from '@/components/layout/Sidebar';
import { NotificationProvider } from '@/components/notifications/NotificationSystem';
import { ApprovalCardsProvider } from '@/components/features/approvals/ApprovalCardsProvider';
import { GlobalAlertOverlay } from '@/components/layout/GlobalAlertOverlay';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AGStock Ult | AI Command Center',
  description: 'Next-Gen AI Trading Interface',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ja' suppressHydrationWarning>
      <body
        className={`${outfit.variable} font-sans antialiased bg-background text-foreground overflow-hidden`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem={false}
          disableTransitionOnChange
        >
          <NotificationProvider>
            <QueryProvider>
              <div className='flex w-full h-screen'>
                <Sidebar />
                <main className='flex-1 h-full overflow-y-auto relative'>
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02] pointer-events-none" />
                  <ErrorBoundary>{children}</ErrorBoundary>
                </main>
                <ApprovalCardsProvider />
                <GlobalAlertOverlay />
              </div>
            </QueryProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
