'use client';

import './globals.css';
import { Outfit, Geist_Mono } from 'next/font/google';

const outfit = Outfit({
    variable: '--font-outfit',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${outfit.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}>
                <div className="flex flex-col items-center justify-center min-h-screen relative p-4">

                    {/* Background Effects */}
                    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-destructive/50 rounded-full blur-[100px] animate-pulse-slow"></div>
                        <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-primary/30 rounded-full blur-[80px]"></div>
                    </div>

                    <div className="glass-panel max-w-2xl w-full p-8 rounded-2xl z-10 border-destructive/50 shadow-[0_0_50px_rgba(255,0,0,0.2)] text-center space-y-6">

                        {/* Icon */}
                        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/30 mb-4 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-destructive">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>

                        <h2 className="text-4xl font-bold tracking-tight neon-text text-destructive">
                            SYSTEM CRITICAL FAILURE
                        </h2>

                        <p className="text-xl text-muted-foreground">
                            An unrecoverable error has occurred in the neural interface.
                        </p>

                        <div className="bg-black/40 p-4 rounded-lg font-mono text-sm text-left border border-white/5 overflow-auto max-h-40">
                            <p className="text-red-400">$ ERROR_CODE: {error.digest || 'UNKNOWN_EXCEPTION'}</p>
                            <p className="text-muted-foreground mt-1">{error.message}</p>
                        </div>

                        <div className="pt-4 flex justify-center gap-4">
                            <button
                                onClick={() => reset()}
                                className="glass-button px-8 py-3 rounded-full text-lg font-medium hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-300"
                            >
                                Initialize System Reboot
                            </button>

                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 rounded-full text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                            >
                                Hard Refresh
                            </button>
                        </div>
                    </div>

                    <div className="absolute bottom-8 text-xs text-muted-foreground font-mono opacity-50">
                        ULT TRADING SYSTEM v3.0 // SECURITY LEVEL: NULL
                    </div>
                </div>
            </body>
        </html>
    );
}
