import { useMemo } from 'react'

export interface PnLData {
  pnl: number
  pnlPercent: number
  isProfit: boolean
}

export function usePnL(
  currentPrice: number,
  avgPrice: number,
  quantity: number
): PnLData {
  return useMemo(() => {
    const pnl = (currentPrice - avgPrice) * quantity
    const pnlPercent = ((currentPrice - avgPrice) / avgPrice) * 100
    const isProfit = pnl >= 0

    return {
      pnl,
      pnlPercent,
      isProfit,
    }
  }, [currentPrice, avgPrice, quantity])
}
