
import { accuracyService } from '../lib/AccuracyService';
import { OHLCV } from '../types';

describe('Accuracy Improvement Test (TDD)', () => {
    // 強い上昇トレンドデータを生成するヘルパー
    function generateUpTrendData(days: number): OHLCV[] {
        const data: OHLCV[] = [];
        let price = 1000;
        const now = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - (days - i));
            // 確実に価格が上がり続ける（ノイズ少なめ）
            price += 5 + (Math.random() * 2);
            data.push({
                date: date.toISOString(),
                open: price - 2, high: price + 5, low: price - 5, close: price,
                volume: 100000
            });
        }
        return data;
    }

    it('should achieve at least 50% directional accuracy in a strong UP trend', () => {
        const data = generateUpTrendData(150);
        const result = accuracyService.calculateRealTimeAccuracy('UP_TREND_TEST', data, 'japan');
        
        console.log(`Current Directional Accuracy: ${result?.directionalAccuracy}%`);
        
        // 現状は 0% なので、ここで失敗（Red）することを期待
        expect(result).not.toBeNull();
        if (result) {
            expect(result.directionalAccuracy).toBeGreaterThanOrEqual(50);
        }
    });
});
