
import { accuracyService } from '../lib/AccuracyService';
import { OHLCV } from '../types';

describe('Accuracy Verification', () => {
    function generateTestData(trend: 'up' | 'down' | 'flat'): OHLCV[] {
        const data: OHLCV[] = [];
        let price = 1000;
        const now = new Date();
        for (let i = 0; i < 150; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - (150 - i));
            const change = trend === 'up' ? 5 : trend === 'down' ? -5 : 0;
            const noise = (Math.random() - 0.5) * 2;
            price += change + noise;
            data.push({
                date: date.toISOString(),
                open: price - 2, high: price + 5, low: price - 5, close: price,
                volume: 100000
            });
        }
        return data;
    }

    test('Report current logic accuracy', () => {
        const trends: ('up' | 'down' | 'flat')[] = ['up', 'down', 'flat'];
        console.log('\n--- 📊 予測精度レポート ---');
        trends.forEach(trend => {
            const data = generateTestData(trend);
            const result = accuracyService.calculateRealTimeAccuracy('TEST', data, 'japan');
            if (result) {
                console.log(`トレンド: ${trend.toUpperCase().padEnd(5)} | 方向的中率: ${result.directionalAccuracy}% | 厳密的中率: ${result.precisionAccuracy}% | 試行数: ${result.totalTrades}`);
            }
        });
        console.log('--------------------------\n');
    });
});
