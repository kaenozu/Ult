import { useQuery } from '@tanstack/react-query'
import { getSignal, getMarketData } from '@/lib/api'
import { SignalResponse, MarketDataResponse } from '@/types'

export function useBatchSignalData(tickers: string[]) {
  return useQuery({
    queryKey: ['batch-signals', tickers],
    queryFn: async () => {
      const signals = await Promise.all(
        tickers.map(async (ticker) => {
          const [aiSignal, rsiSignal, bbSignal, market] = await Promise.all([
            getSignal(ticker, 'LightGBM'),
            getSignal(ticker, 'RSI'),
            getSignal(ticker, 'BOLLINGER'),
            getMarketData(ticker),
          ])

          return {
            ticker,
            aiSignal,
            rsiSignal,
            bbSignal,
            market,
          }
        })
      )

      return signals.reduce(
        (acc, item) => {
          acc[item.ticker] = item
          return acc
        },
        {} as Record<
          string,
          {
            ticker: string
            aiSignal: SignalResponse
            rsiSignal: SignalResponse
            bbSignal: SignalResponse
            market: MarketDataResponse
          }
        >
      )
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute instead of individual polling
  })
}

export function useBatchMarketData(tickers: string[]) {
  return useQuery({
    queryKey: ['batch-market', tickers],
    queryFn: async () => {
      const marketData = await Promise.all(
        tickers.map((ticker) => getMarketData(ticker))
      )

      return marketData.reduce(
        (acc, item) => {
          acc[item.ticker] = item
          return acc
        },
        {} as Record<string, MarketDataResponse>
      )
    },
    staleTime: 10000, // Market data is more time-sensitive
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}
