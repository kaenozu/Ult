import { Signal } from '@/app/types';
import { getConfidenceColor, cn } from '@/app/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface SignalCardProps {
    signal: Signal;
    isLive?: boolean;
}

export function SignalCard({ signal, isLive = false }: SignalCardProps) {
    const isBuy = signal.type === 'BUY';
    const isSell = signal.type === 'SELL';

    return (
        <div className={cn(
            "relative p-4 rounded-lg border flex flex-col gap-3 overflow-hidden",
            "bg-[#141e27] border-[#233648]", // Common style
            isLive && "shadow-[0_0_15px_rgba(59,130,246,0.1)]"
        )}>
            {isLive && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Live</span>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isBuy ? "bg-green-500/20 text-green-500" : isSell ? "bg-red-500/20 text-red-500" : "bg-gray-500/20 text-gray-400"
                    )}>
                        {isBuy ? <ArrowUp size={18} strokeWidth={3} /> : isSell ? <ArrowDown size={18} strokeWidth={3} /> : <Minus size={18} strokeWidth={3} />}
                    </div>
                    <div>
                        <div className="text-[10px] text-[#92adc9] font-bold uppercase tracking-wider">Action</div>
                        <div className={cn("text-lg font-black leading-none", isBuy ? "text-green-500" : isSell ? "text-red-500" : "text-gray-400")}>
                            {signal.type}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-[#92adc9] font-bold uppercase tracking-wider">Confidence</div>
                    <div className={cn("text-xl font-black tabular-nums", getConfidenceColor(signal.confidence))}>
                        {signal.confidence}%
                    </div>
                </div>
            </div>

            <div className="text-xs text-secondary/80 leading-snug bg-black/20 p-2 rounded border border-white/5">
                {signal.reason}
            </div>
        </div>
    );
}
