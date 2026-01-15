import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Test utility to render components with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  { queryClient = new QueryClient(), ...renderOptions } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <ErrorBoundary>{children}</ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Test utility for mocking API responses
export const mockApiResponse = (url: string, response: any) => {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
    } as Response)
  )
}

// Test utility for simulating async operations
export const waitForAsync = () => waitFor(() => {}, { timeout: 100 })

// Common test data
export const mockMarketData = {
  symbol: '7203',
  price: 2500,
  change_percent: 2.5,
  volume: 1000000,
  timestamp: '2024-01-15T10:00:00Z',
}

export const mockSignalData = {
  ticker: '7203',
  signal: 1,
  confidence: 0.85,
  strategy: 'LightGBM',
  explanation: 'Strong buy signal detected',
  target_price: 2600,
}

export const mockPosition = {
  ticker: '7203',
  quantity: 100,
  avg_price: 2300,
}
