import { Signal, AIStatus, PaperTrade } from '../types';

/**
 * Service to handle AI trading logic.
 * Decoupled from Zustand store for better testability.
 */
class AITradeService {
    /**
     * Processes potentially closing or opening trades based on AI signals.
     * Returns a new AIStatus if modified, or null if no changes.
     */
    processTrades(
        symbol: string,
        currentPrice: number,
        signal: Signal | null,
        currentStatus: AIStatus
    ): {
        newStatus: AIStatus,
        action?: 'OPEN' | 'CLOSE',
        trade?: PaperTrade
    } | null {

        const slippage = POSITION_SIZING.SLIPPAGE_PERCENTAGE;
        const openTrade = currentStatus.trades.find(t => t.symbol === symbol && t.status === 'OPEN');

        if (openTrade) {
            let shouldClose = false;
            let reflection = "";

            if (signal) {
                if (openTrade.type === 'BUY') {
                    if (currentPrice >= signal.targetPrice) {
                        shouldClose = true;
                        reflection = "利確ターゲット到達。AI予測通りの反発を利益に変えました。";
                    } else if (currentPrice <= signal.stopLoss) {
                        shouldClose = true;
                        reflection = "損切りライン接触。想定以上の売り圧力により予測を逸脱。";
                    } else if (signal.type === 'SELL') {
                        shouldClose = true;
                        reflection = "トレンド転換シグナルを検出し、エグジット。";
                    }
                } else if (openTrade.type === 'SELL') {
                    if (currentPrice <= signal.targetPrice) {
                        shouldClose = true;
                        reflection = "空売り利確成功。目標値での買い戻しを完了。";
                    } else if (currentPrice >= signal.stopLoss) {
                        shouldClose = true;
                        reflection = "上昇トレンドへの回帰を確認。ショートカバーを実行。";
                    } else if (signal.type === 'BUY') {
                        shouldClose = true;
                        reflection = "上昇シグナル発生により、空売りポジションを解消。";
                    }
                }
            }

            if (shouldClose) {
                const exitPrice = openTrade.type === 'BUY' ? currentPrice * (1 - slippage) : currentPrice * (1 + slippage);
                const profit = openTrade.type === 'BUY'
                    ? (exitPrice - openTrade.entryPrice) * openTrade.quantity
                    : (openTrade.entryPrice - exitPrice) * openTrade.quantity;
                const profitPercent = (profit / (openTrade.entryPrice * openTrade.quantity)) * 100;

                // Apply advanced reflection based on market context
                let advancedReflection = reflection;
                if (signal?.marketContext) {
                    const { indexSymbol, correlation, indexTrend } = signal.marketContext;
                    const isMarketDrag = (openTrade.type === 'BUY' && indexTrend === 'DOWN') || (openTrade.type === 'SELL' && indexTrend === 'UP');

                    if (profitPercent < 0 && isMarketDrag && correlation > MARKET_CORRELATION.STRONG_THRESHOLD) {
                        advancedReflection = `${reflection} 個別要因よりも、${indexSymbol}の${indexTrend === 'DOWN' ? '下落' : '上昇'}による市場全体の地合い(r=${correlation.toFixed(2)})に強く引きずられた形です。`;
                    } else if (profitPercent > 0 && !isMarketDrag && correlation > MARKET_CORRELATION.STRONG_THRESHOLD) {
                        advancedReflection = `${reflection} ${indexSymbol}の良好な地合い(r=${correlation.toFixed(2)})が予測を強力に後押ししました。`;
                    }
                }

                const closedTrade: PaperTrade = {
                    ...openTrade,
                    status: 'CLOSED' as const,
                    exitPrice,
                    exitDate: new Date().toISOString(),
                    profitPercent,
                    reflection: advancedReflection
                };

                const updatedTrades = currentStatus.trades.map(t => t.id === openTrade.id ? closedTrade : t);

                return {
                    newStatus: {
                        ...currentStatus,
                        virtualBalance: currentStatus.virtualBalance + (openTrade.entryPrice * openTrade.quantity) + profit,
                        totalProfit: currentStatus.totalProfit + profit,
                        trades: updatedTrades
                    },
                    action: 'CLOSE',
                    trade: closedTrade
                };
            }
        }

        // New Entry Logic
        const HIGH_CONFIDENCE_THRESHOLD = 80;
        if (!openTrade && signal && signal.confidence >= HIGH_CONFIDENCE_THRESHOLD && signal.type !== 'HOLD') {
            const entryPrice = signal.type === 'BUY' ? currentPrice * (1 + slippage) : currentPrice * (1 - slippage);
            const quantity = Math.floor((currentStatus.virtualBalance * POSITION_SIZING.DEFAULT_RATIO) / entryPrice);

            if (quantity > 0) {
                const newTrade: PaperTrade = {
                    id: crypto.randomUUID(),
                    symbol,
                    type: signal.type as 'BUY' | 'SELL',
                    entryPrice,
                    quantity,
                    status: 'OPEN',
                    entryDate: new Date().toISOString(),
                };

                return {
                    newStatus: {
                        ...currentStatus,
                        virtualBalance: currentStatus.virtualBalance - (entryPrice * quantity),
                        trades: [newTrade, ...currentStatus.trades]
                    },
                    action: 'OPEN',
                    trade: newTrade
                };
            }
        }

        return null;
    }
}

export const aiTradeService = new AITradeService();
