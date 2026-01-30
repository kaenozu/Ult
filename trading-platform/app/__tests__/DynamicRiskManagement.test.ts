/**
 * DynamicRiskManagement.test.ts
 * 動的リスク管理サービスのテスト
 */

import { dynamicRiskManagement } from '../lib/DynamicRiskManagement';
import { OHLCV, RiskManagementSettings } from '../types';

describe('DynamicRiskManagement', () => {
    describe('calculateDynamicRisk', () => {
        it('should calculate dynamic risk for LONG position', () => {
            const data = generateMockData(100);
            const settings: RiskManagementSettings = {
                sizingMethod: 'fixed_ratio',
                fixedRatio: 0.1,
                maxRiskPercent: 2,
                maxPositionPercent: 20,
                stopLoss: { enabled: true, type: 'percentage', value: 2, trailing: false },
                takeProfit: { enabled: true, type: 'percentage', value: 4, partials: false },
            };

            const result = dynamicRiskManagement.calculateDynamicRisk(100000, 100, 'LONG', data, settings);

            expect(result.positionSize).toBeGreaterThan(0);
            expect(result.stopLossPrice).toBeLessThan(100);
            expect(result.takeProfitPrice).toBeGreaterThan(100);
            expect(result.riskRewardRatio).toBeGreaterThan(0);
            expect(result.positionSizingMethod).toContain('ケリー基準');
        });

        it('should calculate dynamic risk for SHORT position', () => {
            const data = generateMockData(100);
            const settings: RiskManagementSettings = {
                sizingMethod: 'fixed_ratio',
                fixedRatio: 0.1,
                maxRiskPercent: 2,
                maxPositionPercent: 20,
                stopLoss: { enabled: true, type: 'percentage', value: 2, trailing: false },
                takeProfit: { enabled: true, type: 'percentage', value: 4, partials: false },
            };

            const result = dynamicRiskManagement.calculateDynamicRisk(100000, 100, 'SHORT', data, settings);

            expect(result.positionSize).toBeGreaterThan(0);
            expect(result.stopLossPrice).toBeGreaterThan(100);
            expect(result.takeProfitPrice).toBeLessThan(100);
            expect(result.riskRewardRatio).toBeGreaterThan(0);
        });

        it('should respect max position size limit', () => {
            const data = generateMockData(100);
            const settings: RiskManagementSettings = {
                sizingMethod: 'fixed_ratio',
                fixedRatio: 0.5, // 50%
                maxRiskPercent: 2,
                maxPositionPercent: 20,
                stopLoss: { enabled: true, type: 'percentage', value: 2, trailing: false },
                takeProfit: { enabled: true, type: 'percentage', value: 4, partials: false },
            };

            const result = dynamicRiskManagement.calculateDynamicRisk(100000, 100, 'LONG', data, settings);

            expect(result.positionSize).toBeLessThanOrEqual(20000); // 20% of 100k / 100 = 2000 shares
        });

        it('should respect minimum position size', () => {
            const data = generateMockData(100);
            const settings: RiskManagementSettings = {
                sizingMethod: 'fixed_ratio',
                fixedRatio: 0.001, // 0.1%
                maxRiskPercent: 2,
                maxPositionPercent: 20,
                stopLoss: { enabled: true, type: 'percentage', value: 2, trailing: false },
                takeProfit: { enabled: true, type: 'percentage', value: 4, partials: false },
            };

            const result = dynamicRiskManagement.calculateDynamicRisk(100000, 100, 'LONG', data, settings);

            expect(result.positionSize).toBeGreaterThanOrEqual(100); // minimum size
        });
    });

    describe('updateTrailingStop', () => {
        it('should initialize trailing stop for LONG position', () => {
            const data = generateMockData(100);
            const result = dynamicRiskManagement.updateTrailingStop('TEST', 'LONG', 102, 100, 2);

            expect(result.enabled).toBe(true);
            expect(result.highestHigh).toBe(102);
            expect(result.currentStop).toBeLessThan(100); // below entry
        });

        it('should initialize trailing stop for SHORT position', () => {
            const data = generateMockData(100);
            const result = dynamicRiskManagement.updateTrailingStop('TEST', 'SHORT', 98, 100, 2);

            expect(result.enabled).toBe(true);
            expect(result.lowestLow).toBe(98);
            expect(result.currentStop).toBeGreaterThan(100); // above entry
        });

        it('should update trailing stop when price moves favorably', () => {
            const data = generateMockData(100);
            
            // 初期化
            dynamicRiskManagement.updateTrailingStop('TEST', 'LONG', 100, 100, 2);
            const initialStop = dynamicRiskManagement.getTrailingStopState('TEST')?.currentStop;
            
            // 価格が上昇
            const result1 = dynamicRiskManagement.updateTrailingStop('TEST', 'LONG', 105, 100, 2);
            expect(result1.currentStop).toBeGreaterThan(initialStop); // stop should move up

            // 価格がさらに上昇
            const result2 = dynamicRiskManagement.updateTrailingStop('TEST', 'LONG', 110, 100, 2);
            expect(result2.currentStop).toBeGreaterThan(result1.currentStop);
        });
    });

    describe('checkStopLoss', () => {
        it('should trigger stop loss for LONG position', () => {
            const data = generateMockData(100);
            dynamicRiskManagement.updateTrailingStop('TEST', 'LONG', 100, 100, 2);

            const result = dynamicRiskManagement.checkStopLoss('TEST', 'LONG', 100, 2);

            expect(result.triggered).toBe(true);
            expect(result.reason).toContain('ストップ');
        });

        it('should not trigger stop loss for LONG position above stop', () => {
            const data = generateMockData(100);
            dynamicRiskManagement.updateTrailingStop('TEST', 'LONG', 100, 100, 2);

            const result = dynamicRiskManagement.checkStopLoss('TEST', 'LONG', 102, 100, 2);

            expect(result.triggered).toBe(false);
            expect(result.reason).toBe('未トリガー');
        });
    });

    describe('checkTakeProfit', () => {
        it('should trigger take profit for LONG position', () => {
            const result = dynamicRiskManagement.checkTakeProfit('LONG', 105, 104);

            expect(result.triggered).toBe(true);
            expect(result.reason).toBe('利確');
        });

        it('should not trigger take profit for LONG position below target', () => {
            const result = dynamicRiskManagement.checkTakeProfit('LONG', 103, 104);

            expect(result.triggered).toBe(false);
            expect(result.reason).toBe('未トリガー');
        });
    });

    describe('getVolatilityRiskLevel', () => {
        it('should return LOW volatility', () => {
            const data = generateMockData(100);
            // 低ボラティリティ（価格変動が小さい）
            for (let i = 0; i < data.length; i++) {
                data[i].close = 100 + (Math.random() - 0.5) * 0.5;
            }

            const result = dynamicRiskManagement.getVolatilityRiskLevel(data);

            expect(result).toBe('LOW');
        });

        it('should return MEDIUM volatility', () => {
            const data = generateMockData(100);
            // 中ボラティリティ（価格変動が中程度）
            for (let i = 0; i < data.length; i++) {
                data[i].close = 100 + (Math.random() - 0.5) * 2;
            }

            const result = dynamicRiskManagement.getVolatilityRiskLevel(data);

            expect(result).toBe('MEDIUM');
        });

        it('should return HIGH volatility', () => {
            const data = generateMockData(100);
            // 高ボラティリティ（価格変動が大きい）
            for (let i = 0; i < data.length; i++) {
                data[i].close = 100 + (Math.random() - 0.5) * 4;
            }

            const result = dynamicRiskManagement.getVolatilityRiskLevel(data);

            expect(result).toBe('HIGH');
        });

        it('should return HIGH volatility', () => {
            const data = generateMockData(100);
            // 高ボラティリティ（価格変動が大きい）
            for (let i = 0; i < data.length; i++) {
                data[i].close = 100 + (Math.random() - 0.5) * 4;
            }

            const result = dynamicRiskManagement.getVolatilityRiskLevel(data);

            expect(result).toBe('HIGH');
        });
    });

    describe('getVolatilityAdjustmentFactor', () => {
        it('should return >1 for LOW volatility', () => {
            const data = generateMockData(100);
            for (let i = 0; i < data.length; i++) {
                data[i].close = 100 + (Math.random() - 0.5) * 0.5;
            }

            const factor = dynamicRiskManagement.getVolatilityAdjustmentFactor(data);

            expect(factor).toBeGreaterThan(1);
        });

        it('should return <1 for HIGH volatility', () => {
            const data = generateMockData(100);
            for (let i = 0; i < data.length; i++) {
                data[i].close = 100 + (Math.random() - 0.5) * 4;
            }

            const factor = dynamicRiskManagement.getVolatilityAdjustmentFactor(data);

            expect(factor).toBeLessThan(1);
        });

        it('should return 1 for MEDIUM volatility', () => {
            const data = generateMockData(100);
            for (let i = 0; i < data.length; i++) {
                data[i].close = 100 + (Math.random() - 0.5) * 2;
            }

            const factor = dynamicRiskManagement.getVolatilityAdjustmentFactor(data);

            expect(factor).toBe(1);
        });
    });

    describe('clearTrailingStopState', () => {
        it('should clear trailing stop state', () => {
            const data = generateMockData(100);
            dynamicRiskManagement.updateTrailingStop('TEST', 'LONG', 100, 100, 2);

            expect(dynamicRiskManagement.getTrailingStopState('TEST')).toBeDefined();

            dynamicRiskManagement.clearTrailingStopState('TEST');

            expect(dynamicRiskManagement.getTrailingStopState('TEST')).toBeUndefined();
        });
    });
});

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
