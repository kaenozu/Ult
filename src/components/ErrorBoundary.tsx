'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-full p-6">
                    <div className="glass-panel p-8 rounded-xl border-destructive/30 shadow-[0_0_30px_rgba(255,0,0,0.1)] text-center max-w-md w-full">
                        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/30 mb-4 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-destructive">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2 neon-text text-destructive">System Alert</h2>
                        <div className="bg-black/40 p-3 rounded text-left mb-4 border border-white/5 max-h-32 overflow-auto custom-scrollbar">
                            <p className="font-mono text-xs text-red-300 break-words">{this.state.error?.message || 'Unknown Error'}</p>
                        </div>
                        <button
                            className="w-full glass-button py-2 hover:bg-destructive/20 border border-destructive/30 text-destructive rounded-lg transition-all duration-300 font-medium text-sm neon-text"
                            onClick={() => this.setState({ hasError: false })}
                        >
                            INITIATE REBOOT SEQUENCE
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
