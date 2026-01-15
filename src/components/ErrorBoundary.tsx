'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; onReset?: () => void }>
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })

    // Here you could send the error to a logging service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error?: Error
  onReset?: () => void
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 bg-muted/10 rounded-lg border border-border/50">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
      <p className="text-muted-foreground text-center mb-4 max-w-md">
        予期せぬエラーが発生しました。ページを再読み込みするか、以下のボタンをクリックして再試行してください。
      </p>
      {error && (
        <details className="mb-4 text-left">
          <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
            エラー詳細
          </summary>
          <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-32">
            {error.message}
            {error.stack}
          </pre>
        </details>
      )}
      <div className="flex gap-2">
        <Button onClick={onReset} variant="default" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          再試行
        </Button>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          ページを再読み込み
        </Button>
      </div>
    </div>
  )
}

// Hook for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    console.error('Error handled by useErrorHandler:', error)
    setError(error)
  }, [])

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { handleError, resetError }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
