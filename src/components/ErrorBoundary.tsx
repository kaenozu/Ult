"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { cn } from "@/components/shared/utils/common";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showDetails?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    // Enhanced error logging
    console.group("🚨 Error Boundary Caught Error");
    
    
    
    
    console.groupEnd();

    // Call optional error handler
    onError?.(error, errorInfo);

    this.setState((prevState) => ({
      errorInfo,
      retryCount: prevState.retryCount + 1,
    }));

    // Auto-retry for recoverable errors
    if (retryCount < maxRetries && this.isRecoverableError(error)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  private isRecoverableError = (error: Error): boolean => {
    // Define which errors are recoverable
    const recoverablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /retry/i,
    ];

    return recoverablePatterns.some((pattern) => pattern.test(error.message));
  };

  private scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000); // Exponential backoff, max 30s

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    const { onReset } = this.props;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    onReset?.();
  };

  private handleManualRetry = () => {
    this.setState((prevState) => ({
      retryCount: 0, // Reset retry count for manual retry
    }));
    this.handleRetry();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const bugReport = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // In a real app, send to error reporting service
    

    // Copy to clipboard for manual reporting
    navigator.clipboard?.writeText(JSON.stringify(bugReport, null, 2));
  };

  render() {
    const {
      fallback,
      showDetails = process.env.NODE_ENV === "development",
      maxRetries = 3,
    } = this.props;
    const { hasError, error, errorInfo, retryCount } = this.state;

    if (!hasError) {
      return this.props.children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    const canRetry = retryCount < maxRetries;
    const isDevelopment = process.env.NODE_ENV === "development";

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-2xl w-full space-y-6">
          {/* Error Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center border-2 border-destructive/20">
              <AlertTriangle className="w-10 h-10 text-destructive animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground text-lg">
                We encountered an unexpected error. Our team has been notified.
              </p>
            </div>
          </div>

          {/* Error Details (Development Only) */}
          {showDetails && error && (
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Error Details
              </h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Message:</span>
                  <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                    {error.message}
                  </code>
                </div>
                {errorInfo?.componentStack && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">
                      Component Stack
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {canRetry && (
              <Button
                onClick={this.handleManualRetry}
                className="flex items-center gap-2"
                variant="default"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again ({maxRetries - retryCount} attempts left)
              </Button>
            )}

            <Button
              onClick={this.handleGoHome}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>

            {isDevelopment && (
              <Button
                onClick={this.handleReportBug}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Bug className="w-4 h-4" />
                Copy Bug Report
              </Button>
            )}
          </div>

          {/* Retry Status */}
          {retryCount > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Retry attempts: {retryCount}/{maxRetries}
              {retryCount >= maxRetries && (
                <div className="text-destructive mt-1">
                  Maximum retry attempts reached
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    showDetails={true}
    maxRetries={3}
    onError={(error, errorInfo) => {
      // Send to error reporting service
      
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ErrorBoundary
    fallback={
      fallback || (
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            Component failed to load
          </div>
        </div>
      )
    }
    showDetails={false}
    maxRetries={1}
  >
    {children}
  </ErrorBoundary>
);
