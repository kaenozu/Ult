'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
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
        console.error(`ErrorBoundary caught an error in ${this.props.name || 'component'}:`, error, errorInfo);
    }

    public resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-6 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                    <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
                    <h3 className="text-lg font-bold text-red-400 mb-1">
                        {this.props.name ? `${this.props.name} エラー` : 'エラーが発生しました'}
                    </h3>
                    <p className="text-sm text-red-300 mb-4 max-w-md">
                        予期せぬエラーが発生しました。
                        {this.state.error && <span className="block mt-1 text-xs opacity-70">{this.state.error.message}</span>}
                    </p>
                    <button
                        onClick={this.resetError}
                        className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm font-medium"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        再試行
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
