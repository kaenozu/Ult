"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketData, getSignal } from "@/components/shared/utils/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import TradingModal from "./TradingModal";
import Link from "next/link";
import { Position } from "@/types";
import { usePnL } from "@/components/shared/hooks/usePnL";
import { useAlert } from "@/components/shared/hooks/useAlert";
import { GlitchText } from "@/components/ui/glitch-text";

interface PositionRowProps {
  position: Position;
}

function PositionRow({ position }: PositionRowProps) {
  const { ticker, quantity, avg_price } = position;

  const { data: market } = useQuery({
    queryKey: ["market", ticker],
    queryFn: () => getMarketData(ticker),
    refetchInterval: 10000,
  });

  const { data: signal } = useQuery({
    queryKey: ["signal", ticker],
    queryFn: () => getSignal(ticker),
    refetchInterval: 60000,
  });

  if (!market) return null;

  const currentPrice = market.price;
  const { pnl, pnlPercent, isProfit } = usePnL(
    currentPrice,
    avg_price,
    quantity,
  );
  const { showAlert } = useAlert(signal, pnlPercent);

  return (
    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg mb-3">
      <div>
        <div className="flex items-center gap-2">
          <Link href={`/stocks/${ticker}`} className="font-bold text-lg">
            <GlitchText text={ticker} intensity="low" color="cyan" />
          </Link>
          {showAlert && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 animate-pulse"
            >
              <AlertTriangle className="h-3 w-3" />
              売り時!
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {quantity}株 | 取得単価 ¥{avg_price.toLocaleString()}
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono font-medium">
          ¥{currentPrice.toLocaleString()}
        </div>
        <div
          className={`text-sm font-bold flex items-center justify-end ${isProfit ? "text-green-500" : "text-red-500"}`}
        >
          {isProfit ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          {pnl > 0 ? "+" : ""}
          {pnl.toLocaleString()} ({pnlPercent.toFixed(1)}%)
        </div>
      </div>

      <div className="ml-4">
        <TradingModal
          ticker={ticker}
          name={ticker}
          price={currentPrice}
          action="SELL"
          maxQuantity={quantity}
          trigger={
            <Button
              size="sm"
              variant={showAlert ? "default" : "outline"}
              className={
                showAlert
                  ? "bg-rose-500 hover:bg-rose-600 border-none text-white shadow-md"
                  : ""
              }
            >
              売却
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default PositionRow;
