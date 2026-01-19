import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeTrade, TradeRequest } from '@/lib/api'

export const useExecuteTrade = () => {
  const queryClient = useQueryClient()

  const tradeMutation = useMutation({
    mutationFn: executeTrade,
    onSuccess: () => {
      // Invalidate and refetch queries to update UI
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['marketData'] })
    },
  })

  return {
    executeTrade: tradeMutation.mutateAsync,
    isLoading: tradeMutation.isPending,
    error: tradeMutation.error,
  }
}
