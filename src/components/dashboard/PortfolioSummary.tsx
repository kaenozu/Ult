'use client';

import { useQuery } from '@tanstack/react-query';
import { getPortfolio } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export default function PortfolioSummary() {
    const { data, isLoading } = useQuery({
        queryKey: ['portfolio'],
        queryFn: getPortfolio,
    });

    if (isLoading) {
        return <div className="h-[200px] w-full rounded-xl bg-muted/20 animate-pulse" />;
    }

    // Fallback if data is missing (e.g. API error or first run)
    const portfolio = data || {
        total_equity: 1000000,
        cash: 1000000,
        invested_amount: 0,
        unrealized_pnl: 0,
        position_count: 0
    };

    const isProfit = portfolio.unrealized_pnl >= 0;

    return (
        <Card className="bg-gradient-to-br from-card to-muted/20 border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" /> あなたの総資産
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-5xl font-extrabold tracking-tighter font-sans">
                    ¥ {portfolio.total_equity.toLocaleString()}
                </div>
                <div className={`flex items-center mt-3 text-lg font-medium ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {portfolio.unrealized_pnl !== 0 && (
                        isProfit ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />
                    )}
                    {isProfit ? '+' : ''}{portfolio.unrealized_pnl.toLocaleString()} 円
                    <span className="text-muted-foreground text-xs ml-2 font-normal">
                        (今日の実績)
                    </span>
                </div>
                <div className="mt-6 flex gap-6 text-sm text-muted-foreground border-t pt-4">
                    <div className="flex flex-col">
                        <span className="text-xs">現金残高</span>
                        <span className="font-medium text-foreground">¥{portfolio.cash.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs">株式投資額</span>
                        <span className="font-medium text-foreground">¥{portfolio.invested_amount.toLocaleString()}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
