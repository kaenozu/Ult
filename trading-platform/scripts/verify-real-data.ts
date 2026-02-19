import YahooFinance from 'yahoo-finance2';
import { accuracyService } from '../app/lib/AccuracyService';
import { OHLCV } from '../app/types';

const yf = new YahooFinance();

async function verifyStock(symbol: string) {
    console.log(`\n--- 🚀 実データ検証: ${symbol} ---`);
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);

        const results = await yf.chart(symbol, {
            period1: startDate.toISOString().split('T')[0],
            interval: '1d'
        });

        if (!results || !results.quotes || results.quotes.length === 0) {
            console.error('データが取得できませんでした。');
            return;
        }

        const data: OHLCV[] = results.quotes.map(q => ({
            date: q.date.toISOString(),
            open: q.open || 0,
            high: q.high || 0,
            low: q.low || 0,
            close: q.close || 0,
            volume: q.volume || 0
        })).filter(d => d.close > 0);

        console.log(`取得データ数: ${data.length}件`);

        const accuracy = accuracyService.calculateRealTimeAccuracy(symbol, data, symbol.endsWith('.T') ? 'japan' : 'usa');
        if (accuracy) {
            console.log(`方向的中率: ${accuracy.directionalAccuracy}%`);
            console.log(`厳密的中率: ${accuracy.precisionAccuracy}%`);
            console.log(`試行回数: ${accuracy.totalTrades}回`);
        } else {
            console.log('精度計算に失敗しました（データ不足の可能性があります）。');
        }
    } catch (error) {
        console.error('エラー発生:', error);
    }
}

async function main() {
    await verifyStock('7203.T'); // トヨタ
    await verifyStock('9984.T'); // ソフトバンクグループ
    await verifyStock('AAPL');   // Apple
}

main().catch(console.error);
