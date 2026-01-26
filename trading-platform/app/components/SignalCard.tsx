import { Signal, Stock } from '@/app/types';
import { getConfidenceColor, cn, formatCurrency } from '@/app/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface SignalCardProps {
    signal: Signal;
    stock: Stock;
    isLive?: boolean;
    aiHitRate?: number;
    aiTradesCount?: number;
    calculatingHitRate?: boolean;
    error?: string | null;
}

export function SignalCard({
    signal,
    stock,
    isLive = false,
    aiHitRate,
    aiTradesCount = 0,
    calculatingHitRate = false,
    error = null
}: SignalCardProps) {
    const isBuy = signal.type === 'BUY';
    const isSell = signal.type === 'SELL';

    return (
        <div className={cn(
            "relative p-4 rounded-lg flex flex-col gap-3 overflow-hidden",
            // "bg-[#141e27] border-[#233648]" // Removed conflicting background to let parent control or transparent
            "bg-transparent"
        )}>
            {isLive && (
                <div className="absolute top-0 right-0 flex items-center gap-1.5 z-10">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Live</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm",
                        signal.confidence >= 80 ? "bg-white text-black" : "bg-black/20 text-white/70"
                    )}>
                        {signal.confidence >= 80 ? '🔥 強気シグナル' : '通常シグナル'}
                    </div>
                    {aiHitRate !== undefined && aiHitRate >= 60 && (
                        <div className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 flex items-center gap-1">
                            🌟 高的中率 ({aiHitRate}%)
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-[#92adc9] font-bold uppercase tracking-wider">予測信頼度</div>
                    <div className={cn("text-xl font-black tabular-nums", getConfidenceColor(signal.confidence))}>
                        {signal.confidence}%
                    </div>
                </div>
            </div>

            {/* Action Display */}
            <div className="mt-2 flex items-end justify-between">
                <div className="flex flex-col">
                    <span className={cn(
                        'text-5xl font-black leading-none tracking-tighter',
                        isBuy && 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]',
                        isSell && 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]',
                        !isBuy && !isSell && 'text-gray-400'
                    )}>
                        {isBuy ? '買い' : isSell ? '売り' : '維持'}
                    </span>
                    <span className="text-[10px] font-bold text-[#92adc9] mt-1 ml-1 uppercase">推奨アクション</span>
                </div>

                {/* Hit Rate Stats */}
                <div className="text-right">
                    <div className="text-[10px] text-[#92adc9] uppercase font-bold tracking-widest mb-1">過去の的中率</div>
                    <div className={cn(
                        'text-lg font-black tabular-nums',
                        (aiHitRate || 0) >= 50 ? 'text-white' : 'text-red-400'
                    )}>
                        {calculatingHitRate ? (
                            <span className="text-xs text-[#92adc9] animate-pulse">計算中...</span>
                        ) : error ? (
                            <span className="text-xs text-red-400" title={error}>エラー</span>
                        ) : (
                            `${aiHitRate ?? 0}%`
                        )}
                    </div>
                    {!calculatingHitRate && !error && (
                        <div className="text-[8px] text-[#92adc9]/60">過去{aiTradesCount}回の試行</div>
                    )}
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {/* Prediction Error */}
                {signal.predictionError !== undefined && (
                    <div className="bg-black/20 p-2 rounded-lg border border-[#233648]/50">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold text-[#92adc9] uppercase tracking-wider">予測誤差</div>
                            <div className={cn(
                                'text-xs font-bold tabular-nums',
                                signal.predictionError <= 1.0 ? 'text-green-400' :
                                    signal.predictionError <= 1.5 ? 'text-yellow-400' :
                                        'text-red-400'
                            )}>
                                {signal.predictionError.toFixed(2)}x
                            </div>
                        </div>
                        <div className="text-[8px] text-[#92adc9]/60 mt-1">
                            {signal.predictionError <= 1.0 ? '精度良好' :
                                signal.predictionError <= 1.5 ? 'やや不確実' : '不確実性が高い'}
                        </div>
                    </div>
                )}

                {/* Target / Stop Loss */}
                <div className="relative pt-2">
                    <div className="absolute top-0 left-0 text-[10px] font-bold text-[#92adc9] uppercase tracking-widest">目標価格・リスク管理</div>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="flex-1">
                            <div className="text-[10px] text-[#92adc9] mb-1">利確ターゲット</div>
                            <div className="text-sm font-black text-white bg-white/5 p-2 rounded border border-white/10 text-center">
                                {stock.market === 'japan' ? formatCurrency(signal.targetPrice, 'JPY') : formatCurrency(signal.targetPrice, 'USD')}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] text-red-400/70 mb-1 text-right">損切りライン</div>
                            <div className="text-sm font-black text-red-400 bg-red-400/5 p-2 rounded border border-red-400/20 text-center">
                                {stock.market === 'japan' ? formatCurrency(signal.stopLoss, 'JPY') : formatCurrency(signal.stopLoss, 'USD')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analysis Engine Reason */}
                <div className="bg-black/30 p-3 rounded-lg border border-[#233648] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                    <div className="text-[10px] font-bold text-[#92adc9] mb-1 uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        AI分析エンジン
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed font-medium">
                        {signal.reason}
                    </p>
                </div>
            </div>
        </div>
    );
}
