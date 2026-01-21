'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { executeTrade, TradeRequest } from '@/components/shared/utils/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// ... (imports)

interface TradingModalProps {
  ticker: string
  name: string
  price: number
  trigger: React.ReactNode
  action?: 'BUY' | 'SELL'
  maxQuantity?: number // Only needed for SELL (owned amount)
}

export default function TradingModal({
  ticker,
  name,
  price,
  trigger,
  action = 'BUY',
  maxQuantity = 0,
}: TradingModalProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(action === 'BUY' ? 100000 : 0)
  const [sellQuantity, setSellQuantity] = useState(maxQuantity)
  const queryClient = useQueryClient()

  // Simple visual feedback state
  const [showSuccess, setShowSuccess] = useState(false)

  // Logic differs: BUY by Amount (Budget), SELL by Quantity (Shares)
  const quantity = action === 'BUY' ? Math.floor(amount / price) : sellQuantity
  const estimatedValue = action === 'BUY' ? amount : sellQuantity * price

  // Import hook at top if missing, let's assume global toast or simple one first
  // Actually, let's use the standard shadcn/sonner toast if available, or just console for now if no toast provider
  // Checking imports... not seeing toast.
  // I will check if there is a useToast hook.

  const mutation = useMutation({
    mutationFn: (trade: TradeRequest) => executeTrade(trade),
    onSuccess: (data) => {
      // Show success feedback
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['positions'] })

      // Auto close after delay
      setTimeout(() => {
        setShowSuccess(false)
        setOpen(false)
      }, 1500)
    },
    onError: (error) => {
      console.error('Trade Failed:', error)
    }
  })

  const handleTrade = () => {
    mutation.mutate({
      ticker,
      action: action,
      quantity,
      price,
    })
  }

  const isBuy = action === 'BUY'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-green-500">注文完了 / Order Filled</h3>
            <p className="text-muted-foreground">
              {action} {quantity} shares @ {price.toLocaleString()}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isBuy ? '買う' : '売る'} : {name} ({ticker})
              </DialogTitle>
              <DialogDescription>
                現在価格: ¥{price.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isBuy ? (
                <>
                  {/* BUY UI: Input Amount */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right text-sm font-medium">投資額</span>
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="text-sm">¥</span>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    約 {quantity} 株を購入します
                  </div>
                </>
              ) : (
                <>
                  {/* SELL UI: Input Quantity */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right text-sm font-medium">売却株数</span>
                    <div className="col-span-3 flex items-center gap-2">
                      <Input
                        type="number"
                        value={sellQuantity}
                        max={maxQuantity}
                        onChange={(e) =>
                          setSellQuantity(
                            Math.min(Number(e.target.value), maxQuantity)
                          )
                        }
                        className="col-span-3"
                      />
                      <span className="text-sm">株 / {maxQuantity}</span>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    売却予想額: ¥{estimatedValue.toLocaleString()}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleTrade}
                disabled={mutation.isPending || quantity <= 0}
                variant={isBuy ? 'default' : 'destructive'}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isBuy ? '注文する (Buy)' : '売却する (Sell)'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
