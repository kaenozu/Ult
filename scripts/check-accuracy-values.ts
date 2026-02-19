
import { accuracyService } from './trading-platform/app/lib/AccuracyService';
import { OHLCV } from './trading-platform/app/types';

// 過去100日分のテスト用トレンドデータを生成
function generateTestData(trend: 'up' | 'down' | 'flat'): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 1000;
    const now = new Date();
    
    for (let i = 0; i < 150; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (150 - i));
        
        const change = trend === 'up' ? 2 : trend === 'down' ? -2 : 0;
        const noise = (Math.random() - 0.5) * 5;
        price += change + noise;
        
        data.push({
            date: date.toISOString(),
            open: price - 2,
            high: price + 5,
            low: price - 5,
            close: price,
            volume: 100000 + Math.random() * 50000
        });
    }
    return data;
}

console.log('--- 予測精度シミュレーション開始 ---');

const trends: ('up' | 'down' | 'flat')[] = ['up', 'down', 'flat'];

trends.forEach(trend => {
    const data = generateTestData(trend);
    const result = accuracyService.calculateRealTimeAccuracy('TEST_SYMBOL', data, 'japan');
    
    if (result) {
        console.log(`トレンド型: ${trend}`);
        console.log(`  - 方向的中率 (Directional Accuracy): ${result.directionalAccuracy}%`);
        console.log(`  - 厳密的中率 (Precision Accuracy): ${result.precisionAccuracy}%`);
        console.log(`  - 総トレード試行数: ${result.totalTrades}`);
    } else {
        console.log(`トレンド型: ${trend} - データ不足により計算不能`);
    }
});

console.log('--- シミュレーション終了 ---');
