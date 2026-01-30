/**
 * SignalFilterService.test.ts
 * シグナルフィルタリングサービスのテスト
 */

import { signalFilterService, DEFAULT_SIGNAL_FILTER_CONFIG } from '../lib/SignalFilterService';
import { OHLCV, Signal } from '../types';

describe('SignalFilterService', () => {
    // テスト用のモックデータ生成
    function generateMockData(days: number): OHLCV[] {
        const data: OHLCV[] = [];
        let price = 100;
        const startDate = new Date('2024-01-01');

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);

            const change = (Math.random() - 0.5) * 2;
            const open = price;
            const close = price + change;
            const high = Math.max(open, close) + Math.random();
            const low = Math.min(open, close) - Math.random();
            const volume = Math.floor(Math.random() * 1000000) + 100000;

            data.push({
                date: date.toISOString().split('T')[0],
                open,
                high,
                low,
                close,
                volume
            });

            price = close;
        }

        return data;
    }

    describe('filterSignal', () => {
        it('should filter signal with insufficient data', () => {
            const data = generateMockData(30);
            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const result = signalFilterService.filterSignal(signal, data, DEFAULT_SIGNAL_FILTER_CONFIG);

            expect(result.passed).toBe(false);
            expect(result.confidence).toBe(0);
            expect(result.filteredReason).toContain('データ不足');
        });

        it('should pass signal with all filters enabled', () => {
            const data = generateMockData(100);
            
            // データを調整して全てのフィルタ条件を満たすようにする
            // 価格をSMA20以上、SMA20がSMA50以上にする
            for (let i = 50; i < data.length; i++) {
                data[i].close = 50 + (i - 50) * 0.5; // 上昇トレンド
                data[i].high = data[i].close + 1;
                data[i].low = data[i].close - 1;
                // ボリュームを平均の1.5倍にする
                data[i].volume = 1500000;
            }

            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const result = signalFilterService.filterSignal(signal, data, DEFAULT_SIGNAL_FILTER_CONFIG);

            expect(result.passed).toBe(true);
            expect(result.confidence).toBeGreaterThan(70); // フィルタボーナスが加算される
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('should pass signal with all filters enabled', () => {
            const data = generateMockData(100);
            
            // 価格がSMA20以上、SMA20がSMA50以上（上昇トレンド）
            const closes = data.map(d => d.close);
            const sma20 = 50;
            const sma50 = 48;
            
            // データを調整してトレンド条件を満たすようにする
            for (let i = 50; i < data.length; i++) {
                data[i].close = sma20 + (i - 50) * 0.1;
                data[i].high = data[i].close + 1;
                data[i].low = data[i].close - 1;
                // ボリュームを平均の1.5倍にする
                data[i].volume = 1500000;
            }

            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const result = signalFilterService.filterSignal(signal, data, DEFAULT_SIGNAL_FILTER_CONFIG);

            expect(result.passed).toBe(true);
            expect(result.confidence).toBeGreaterThan(70); // フィルタボーナスが加算される
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('should filter signal with low volume', () => {
            const data = generateMockData(100);
            
            // ボリュームを低くする
            for (let i = 0; i < data.length; i++) {
                data[i].volume = 100000; // 平均より低い
            }

            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const result = signalFilterService.filterSignal(signal, data, DEFAULT_SIGNAL_FILTER_CONFIG);

            expect(result.passed).toBe(false);
            expect(result.filteredReason).toContain('ボリューム不足');
        });

        it('should filter BUY signal with wrong trend', () => {
            const data = generateMockData(100);
            
            // 価格がSMA20以下（下降トレンド）
            const closes = data.map(d => d.close);
            for (let i = 50; i < data.length; i++) {
                data[i].close = 40; // SMA20以下
                data[i].high = data[i].close + 1;
                data[i].low = data[i].close - 1;
                data[i].volume = 1500000;
            }

            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const result = signalFilterService.filterSignal(signal, data, DEFAULT_SIGNAL_FILTER_CONFIG);

            expect(result.passed).toBe(false);
            expect(result.filteredReason).toContain('トレンド不一致');
        });

        it('should filter signal when filters are disabled', () => {
            const data = generateMockData(100);
            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const config = {
                ...DEFAULT_SIGNAL_FILTER_CONFIG,
                enableVolumeFilter: false,
                enableTrendFilter: false,
                enableADXFilter: false,
                enableStochasticFilter: false,
                enableWilliamsRFilter: false,
            };

            const result = signalFilterService.filterSignal(signal, data, config);

            expect(result.passed).toBe(true);
            expect(result.confidence).toBe(70); // フィルタボーナスなし
        });
    });

    describe('volume filter', () => {
        it('should pass when volume is above threshold', () => {
            const data = generateMockData(100);
            
            // ボリュームを高くする
            for (let i = 0; i < data.length; i++) {
                data[i].volume = 2000000; // 平均より高い
            }

            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const result = signalFilterService.filterSignal(signal, data, DEFAULT_SIGNAL_FILTER_CONFIG);

            expect(result.passed).toBe(true);
            expect(result.reasons.some(r => r.includes('ボリューム確認'))).toBe(true);
        });
    });

    describe('trend filter', () => {
        it('should pass BUY signal with uptrend', () => {
            const data = generateMockData(100);
            
            // 上昇トレンドを作成
            for (let i = 50; i < data.length; i++) {
                data[i].close = 50 + (i - 50) * 0.1;
                data[i].high = data[i].close + 1;
                data[i].low = data[i].close - 1;
                data[i].volume = 1500000;
            }

            const signal: Signal = {
                symbol: 'TEST',
                type: 'BUY',
                confidence: 70,
                targetPrice: 105,
                stopLoss: 95,
                reason: 'テストシグナル',
                predictedChange: 5,
                predictionDate: '2024-01-30'
            };

            const result = signalFilterService.filterSignal(signal, data, DEFAULT_SIGNAL_FILTER_CONFIG);

            expect(result.passed).toBe(true);
            expect(result.reasons.some(r => r.includes('トレンド確認'))).toBe(true);
        });
    });
});
