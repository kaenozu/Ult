/**
 * AdvancedTechnicalIndicators.test.ts
 * 高度なテクニカル指標のテスト
 */

import { advancedTechnicalIndicators } from '../lib/AdvancedTechnicalIndicators';
import { OHLCV } from '../types';

describe('AdvancedTechnicalIndicators', () => {
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
            // highは必ずclose以上、lowは必ずclose以下にする
            const high = Math.max(open, close) + Math.abs(Math.random() * 1);
            const low = Math.min(open, close) - Math.abs(Math.random() * 1);
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

    describe('calculateStochastic', () => {
        it('should calculate Stochastic Oscillator correctly', () => {
            const data = generateMockData(30);
            const result = advancedTechnicalIndicators.calculateStochastic(data, 14, 3);

            expect(result.k).toHaveLength(data.length);
            expect(result.d).toHaveLength(data.length);

            // 最初の13要素はNaN（kPeriod - 1 = 14 - 1 = 13）
            for (let i = 0; i < 13; i++) {
                expect(result.k[i]).toBeNaN();
                expect(result.d[i]).toBeNaN();
            }

            // 有効な値は0-100の範囲内
            for (let i = 13; i < data.length; i++) {
                expect(result.k[i]).toBeGreaterThanOrEqual(0);
                expect(result.k[i]).toBeLessThanOrEqual(100);
                expect(result.d[i]).toBeGreaterThanOrEqual(0);
                expect(result.d[i]).toBeLessThanOrEqual(100);
            }
        });

        it('should handle insufficient data', () => {
            const data = generateMockData(10);
            const result = advancedTechnicalIndicators.calculateStochastic(data, 14, 3);

            expect(result.k).toHaveLength(10);
            expect(result.d).toHaveLength(10);

            // 全てNaN
            result.k.forEach(k => expect(k).toBeNaN());
            result.d.forEach(d => expect(d).toBeNaN());
        });
    });

    describe('calculateADX', () => {
        it('should calculate ADX correctly', () => {
            const data = generateMockData(50);
            const result = advancedTechnicalIndicators.calculateADX(data, 14);

            expect(result.adx).toHaveLength(data.length);
            expect(result.plusDI).toHaveLength(data.length);
            expect(result.minusDI).toHaveLength(data.length);

            // 最初の28要素はNaN（period * 2 = 14 * 2 = 28）
            for (let i = 0; i < 28; i++) {
                expect(result.adx[i]).toBeNaN();
                expect(result.plusDI[i]).toBeNaN();
                expect(result.minusDI[i]).toBeNaN();
            }

            // 有効な値は0-100の範囲内
            for (let i = 28; i < data.length; i++) {
                expect(result.adx[i]).toBeGreaterThanOrEqual(0);
                expect(result.adx[i]).toBeLessThanOrEqual(100);
                expect(result.plusDI[i]).toBeGreaterThanOrEqual(0);
                expect(result.plusDI[i]).toBeLessThanOrEqual(100);
                expect(result.minusDI[i]).toBeGreaterThanOrEqual(0);
                expect(result.minusDI[i]).toBeLessThanOrEqual(100);
            }
        });

        it('should handle insufficient data', () => {
            const data = generateMockData(20);
            const result = advancedTechnicalIndicators.calculateADX(data, 14);

            expect(result.adx).toEqual([]);
            expect(result.plusDI).toEqual([]);
            expect(result.minusDI).toEqual([]);
        });
    });

    describe('calculateWilliamsR', () => {
        it('should calculate Williams %R correctly', () => {
            const data = generateMockData(30);
            const result = advancedTechnicalIndicators.calculateWilliamsR(data, 14);

            expect(result.williamsR).toHaveLength(data.length);

            // 最初の13要素はNaN
            for (let i = 0; i < 13; i++) {
                expect(result.williamsR[i]).toBeNaN();
            }

            // 有効な値は-100から0の範囲内
            for (let i = 13; i < data.length; i++) {
                expect(result.williamsR[i]).toBeGreaterThanOrEqual(-100);
                expect(result.williamsR[i]).toBeLessThanOrEqual(0);
            }
        });

        it('should handle insufficient data', () => {
            const data = generateMockData(10);
            const result = advancedTechnicalIndicators.calculateWilliamsR(data, 14);

            expect(result.williamsR).toHaveLength(10);

            // 全てNaN
            result.williamsR.forEach(r => expect(r).toBeNaN());
        });
    });

    describe('getStochasticSignal', () => {
        it('should return BUY signal on golden cross in oversold', () => {
            const k = new Array(30).fill(15);
            const d = new Array(30).fill(18);
            
            // ゴールデンクロス（下から上）- 売られすぎ領域（<20）でクロス
            k[10] = 15;
            d[10] = 18;
            k[11] = 19;  // %Kが%Dを上回る
            d[11] = 17;  // %Dも上昇

            const signal = advancedTechnicalIndicators.getStochasticSignal(k, d, 11);
            expect(signal).toBe('BUY');
        });

        it('should return SELL signal on dead cross in overbought', () => {
            const k = new Array(30).fill(85);
            const d = new Array(30).fill(82);
            
            // デッドクロス（上から下）- 買われすぎ領域（>80）でクロス
            k[10] = 85;
            d[10] = 82;
            k[11] = 78;  // %Kが%Dを下回る
            d[11] = 80;  // %Dも下降

            const signal = advancedTechnicalIndicators.getStochasticSignal(k, d, 11);
            expect(signal).toBe('SELL');
        });

        it('should return NEUTRAL when no cross', () => {
            const k = new Array(30).fill(50);
            const d = new Array(30).fill(50);

            const signal = advancedTechnicalIndicators.getStochasticSignal(k, d, 15);
            expect(signal).toBe('NEUTRAL');
        });
    });

    describe('getADXTrendInfo', () => {
        it('should return STRONG UP trend', () => {
            const adx = new Array(50).fill(45);
            const plusDI = new Array(50).fill(30);
            const minusDI = new Array(50).fill(15);

            const result = advancedTechnicalIndicators.getADXTrendInfo(adx, plusDI, minusDI, 40);
            expect(result.strength).toBe('STRONG');
            expect(result.direction).toBe('UP');
        });

        it('should return WEAK DOWN trend', () => {
            const adx = new Array(50).fill(22);
            const plusDI = new Array(50).fill(15);
            const minusDI = new Array(50).fill(30);

            const result = advancedTechnicalIndicators.getADXTrendInfo(adx, plusDI, minusDI, 40);
            expect(result.strength).toBe('WEAK');
            expect(result.direction).toBe('DOWN');
        });

        it('should return NONE when ADX is low', () => {
            const adx = new Array(50).fill(15);
            const plusDI = new Array(50).fill(30);
            const minusDI = new Array(50).fill(15);

            const result = advancedTechnicalIndicators.getADXTrendInfo(adx, plusDI, minusDI, 40);
            expect(result.strength).toBe('NONE');
            expect(result.direction).toBe('NEUTRAL');
        });
    });

    describe('getWilliamsRSignal', () => {
        it('should return BUY signal when oversold', () => {
            const williamsR = new Array(30).fill(-50);
            williamsR[15] = -85;

            const signal = advancedTechnicalIndicators.getWilliamsRSignal(williamsR, 15);
            expect(signal).toBe('BUY');
        });

        it('should return SELL signal when overbought', () => {
            const williamsR = new Array(30).fill(-50);
            williamsR[15] = -15;

            const signal = advancedTechnicalIndicators.getWilliamsRSignal(williamsR, 15);
            expect(signal).toBe('SELL');
        });

        it('should return NEUTRAL when in middle range', () => {
            const williamsR = new Array(30).fill(-50);

            const signal = advancedTechnicalIndicators.getWilliamsRSignal(williamsR, 15);
            expect(signal).toBe('NEUTRAL');
        });
    });
});
