import { useMemo } from 'react'
import { SignalResponse } from '@/types'

export interface AlertData {
  isSellSignal: boolean
  isHighProfit: boolean
  showAlert: boolean
}

export function useAlert(
  signal?: SignalResponse,
  pnlPercent?: number
): AlertData {
  return useMemo(() => {
    const isSellSignal = signal?.signal === -1
    const isHighProfit = (pnlPercent ?? 0) >= 5.0
    const showAlert = isSellSignal || isHighProfit

    return {
      isSellSignal,
      isHighProfit,
      showAlert,
    }
  }, [signal, pnlPercent])
}
