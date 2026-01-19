import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, PlayCircle, History, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Trade {
    ticker: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    timestamp: string;
    reason: string;
    thought_context?: {
        sentiment_score?: number;
        sentiment_label?: string;
        market_regime?: string;
        news_summary?: string;
    };
}

export const TradeReplayWidget: React.FC = () => {
    const [history, setHistory] = useState<Trade[]>([]);
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

    useEffect(() => {
        fetch('http://localhost:8000/api/v1/replay/history?limit=50')
            .then(res => res.json())
            .then(data => setHistory(data))
            .catch(err => console.error("Failed to load history", err));
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
            {/* Trade List */}
            <Card className="col-span-1 bg-black/40 border-white/10 backdrop-blur-md flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-gray-400">
                        <History className="h-4 w-4" /> Trade History
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                        <div className="space-y-1 p-2">
                            {history.map((trade, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedTrade(trade)}
                                    className={`p-3 rounded cursor-pointer transition-colors border border-transparent ${selectedTrade === trade
                                        ? 'bg-blue-500/20 border-blue-500/50'
                                        : 'hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-white">{trade.ticker}</span>
                                        <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                                            {trade.action}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-gray-500 flex justify-between">
                                        <span>{new Date(trade.timestamp).toLocaleString()}</span>
                                        <span>¥{trade.price.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Replay / Thought Viewer */}
            <Card className="col-span-2 bg-black/40 border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-gray-400">
                        <Brain className="h-4 w-4" /> Neural Replay
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                    {selectedTrade ? (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">
                                        {selectedTrade.action} {selectedTrade.quantity} shares @ ¥{selectedTrade.price}
                                    </h3>
                                    <p className="text-sm text-gray-400">Reason: {selectedTrade.reason}</p>
                                </div>
                                {selectedTrade.thought_context?.sentiment_score && (
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 uppercase tracking-widest">Sentiment</div>
                                        <div className={`text-3xl font-black ${(selectedTrade.thought_context.sentiment_score || 0) > 0 ? 'text-green-500' : 'text-red-500'
                                            }`}>
                                            {selectedTrade.thought_context.sentiment_score.toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded bg-white/5 border border-white/10">
                                    <div className="text-xs text-gray-500 mb-2">Market Regime (at time of trade)</div>
                                    <div className="text-lg font-mono text-blue-300">
                                        {selectedTrade.thought_context?.market_regime || "UNKNOWN"}
                                    </div>
                                </div>
                                <div className="p-4 rounded bg-white/5 border border-white/10">
                                    <div className="text-xs text-gray-500 mb-2">News Context</div>
                                    <p className="text-sm text-gray-300 line-clamp-3">
                                        {selectedTrade.thought_context?.news_summary || "No specific news context logged."}
                                    </p>
                                </div>
                            </div>

                            {!selectedTrade.thought_context && (
                                <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 p-4 rounded">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span>Legacy trade detected. No neural context available for replay.</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 space-y-4">
                            <PlayCircle className="h-16 w-16 opacity-20" />
                            <p>Select a trade from history to replay neural state.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
