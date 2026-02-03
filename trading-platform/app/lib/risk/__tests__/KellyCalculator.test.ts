/**
 * KellyCalculator.test.ts
 * 
 * Kelly Criterion計算エンジンのテスト
 */

import {
  KellyCalculator,
  DEFAULT_KELLY_FRACTION,
  DEFAULT_CONCENTRATION_LIMITS,
} from '../KellyCalculator';
import { KellyParams } from '@/app/types/risk';

describe('KellyCalculator', () => {
  let calculator: KellyCalculator;

  beforeEach(() => {
    calculator = new KellyCalculator();
  });

  describe('初期化', () => {
    it('デフォルト設定で初期化できる', () => {
      expect(calculator).toBeDefined();
      const config = calculator.getConfig();
      expect(config.kellyFraction).toBe(DEFAULT_KELLY_FRACTION);
      expect(config.concentrationLimits).toEqual(DEFAULT_CONCENTRATION_LIMITS);
    });

    it('カスタム設定で初期化できる', () => {
      const customCalculator = new KellyCalculator(0.25, {
        maxSinglePosition: 0.15,
        maxSectorExposure: 0.35,
        minPositions: 3,
        maxPositions: 8,
      });
      
      const config = customCalculator.getConfig();
      expect(config.kellyFraction).toBe(0.25);
      expect(config.concentrationLimits.maxSinglePosition).toBe(0.15);
    });
  });

  describe('Kelly計算 - 基本ケース', () => {
    it('60%勝率、2:1リスクリワードで正しく計算', () => {
      const params: KellyParams = {
        winRate: 0.6,
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: 100000,
        kellyFraction: 0.5,
      };

      const result = calculator.calculate(params);

      // Kelly = (0.6 * 2 - 0.4) / 2 = 0.4 → 半分Kelly = 0.2 (20%)
      expect(result.kellyPercentage).toBeCloseTo(0.2, 2);
      expect(result.recommendedSize).toBeCloseTo(20000, -1);
      expect(result.riskLevel).toBe('HIGH'); // 20% is high risk
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('50%勝率、2:1リスクリワードで正しく計算', () => {
      const params: KellyParams = {
        winRate: 0.5,
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: 100000,
        kellyFraction: 0.5,
      };

      const result = calculator.calculate(params);

      // Kelly = (0.5 * 2 - 0.5) / 2 = 0.25 → 半分Kelly = 0.125 (12.5%)
      expect(result.kellyPercentage).toBeCloseTo(0.125, 3);
      expect(result.recommendedSize).toBeCloseTo(12500, -1);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('70%勝率、1.5:1リスクリワードで正しく計算', () => {
      const params: KellyParams = {
        winRate: 0.7,
        avgWin: 150,
        avgLoss: 100,
        portfolioValue: 100000,
        kellyFraction: 0.5,
      };

      const result = calculator.calculate(params);

      // Kelly = (0.7 * 1.5 - 0.3) / 1.5 = 0.5 → 半分Kelly = 0.25 → cap at 20%
      expect(result.kellyPercentage).toBeLessThanOrEqual(0.20);
      expect(result.riskLevel).toBe('HIGH');
    });
  });

  describe('Kelly計算 - エッジケース', () => {
    it('負のKelly（期待値マイナス）は0を返す', () => {
      const params: KellyParams = {
        winRate: 0.4, // 低い勝率
        avgWin: 100,
        avgLoss: 150, // 損失が大きい
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      expect(result.kellyPercentage).toBe(0);
      expect(result.recommendedSize).toBe(0);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.warnings).toContain(
        'Negative Kelly percentage - expected value is negative, do not trade'
      );
    });

    it('0%勝率はエラーにならず0を返す', () => {
      const params: KellyParams = {
        winRate: 0,
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      expect(result.kellyPercentage).toBe(0);
      expect(result.recommendedSize).toBe(0);
    });

    it('100%勝率は最大20%に制限される', () => {
      const params: KellyParams = {
        winRate: 1.0,
        avgWin: 300,
        avgLoss: 100,
        portfolioValue: 100000,
        kellyFraction: 1.0,
      };

      const result = calculator.calculate(params);

      expect(result.kellyPercentage).toBeLessThanOrEqual(0.20);
      expect(result.recommendedSize).toBeLessThanOrEqual(20000);
    });

    it('極端に低いKelly percentageは警告を出す', () => {
      const params: KellyParams = {
        winRate: 0.51,
        avgWin: 100,
        avgLoss: 100,
        portfolioValue: 100000,
        kellyFraction: 0.1,
      };

      const result = calculator.calculate(params);

      expect(result.warnings).toContain(
        'Very small position size - signal may not be strong enough'
      );
    });
  });

  describe('バリデーション', () => {
    it('不正な勝率を検出する', () => {
      const params: KellyParams = {
        winRate: 1.5, // > 1
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Win rate must be between 0 and 1');
    });

    it('負の平均利益を検出する', () => {
      const params: KellyParams = {
        winRate: 0.6,
        avgWin: -200,
        avgLoss: 100,
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Average win must be positive');
    });

    it('負の平均損失を検出する', () => {
      const params: KellyParams = {
        winRate: 0.6,
        avgWin: 200,
        avgLoss: -100,
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      expect(result.warnings).toContain('Average loss must be positive');
    });

    it('負のポートフォリオ額を検出する', () => {
      const params: KellyParams = {
        winRate: 0.6,
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: -100000,
      };

      const result = calculator.calculate(params);

      expect(result.warnings).toContain('Portfolio value must be positive');
    });
  });

  describe('ボラティリティ調整', () => {
    it('高ボラティリティ時はサイズを縮小する', () => {
      const baseSize = 10000;
      const actualATR = 0.04; // 4% (高い)
      const targetATR = 0.02; // 2% (目標)

      const result = calculator.adjustForVolatility(baseSize, actualATR, targetATR);

      // adjustment factor = 0.02 / 0.04 = 0.5
      expect(result.adjustedSize).toBeCloseTo(5000, -1);
      expect(result.adjustment.adjustmentFactor).toBeCloseTo(0.5, 2);
    });

    it('低ボラティリティ時はサイズを拡大する（上限あり）', () => {
      const baseSize = 10000;
      const actualATR = 0.01; // 1% (低い)
      const targetATR = 0.02; // 2% (目標)

      const result = calculator.adjustForVolatility(baseSize, actualATR, targetATR);

      // adjustment factor = 0.02 / 0.01 = 2.0 (capped)
      expect(result.adjustedSize).toBeCloseTo(20000, -1);
      expect(result.adjustment.adjustmentFactor).toBe(2.0);
    });

    it('調整係数は0.5-2.0の範囲に制限される', () => {
      // 極端に高いボラティリティ
      const highVolResult = calculator.adjustForVolatility(10000, 0.10, 0.02);
      expect(highVolResult.adjustment.adjustmentFactor).toBeGreaterThanOrEqual(0.5);

      // 極端に低いボラティリティ
      const lowVolResult = calculator.adjustForVolatility(10000, 0.005, 0.02);
      expect(lowVolResult.adjustment.adjustmentFactor).toBeLessThanOrEqual(2.0);
    });
  });

  describe('集中度制限', () => {
    it('単一銘柄20%制限を適用する', () => {
      const symbol = 'AAPL';
      const adjustedSize = 30000; // 30% of portfolio
      const portfolioValue = 100000;

      const result = calculator.applyConcentrationLimits(
        symbol,
        adjustedSize,
        portfolioValue
      );

      // 20%制限により20000に削減
      expect(result.finalSize).toBe(20000);
      expect(result.constraints.appliedLimits).toContain('Single position limit: 20%');
    });

    it('制限内のサイズはそのまま適用される', () => {
      const symbol = 'AAPL';
      const adjustedSize = 15000; // 15% of portfolio
      const portfolioValue = 100000;

      const result = calculator.applyConcentrationLimits(
        symbol,
        adjustedSize,
        portfolioValue
      );

      expect(result.finalSize).toBe(15000);
      expect(result.constraints.appliedLimits).toHaveLength(0);
    });

    it('セクター集中度制限を適用する', () => {
      const symbol = 'AAPL';
      const adjustedSize = 20000;
      const portfolioValue = 100000;
      const currentPositions = [
        { symbol: 'MSFT', value: 25000, sector: 'tech' },
        { symbol: 'GOOGL', value: 10000, sector: 'tech' },
      ];

      const result = calculator.applyConcentrationLimits(
        symbol,
        adjustedSize,
        portfolioValue,
        currentPositions
      );

      // セクター合計35000 + 20000 = 55000 > 40000制限
      // 40000 - 35000 = 5000まで許可
      expect(result.finalSize).toBe(5000);
      expect(result.constraints.appliedLimits).toContain('Sector limit: 40%');
    });

    it('リスクレベルを正しく評価する', () => {
      const portfolioValue = 100000;

      // 低リスク (5%)
      const lowRisk = calculator.applyConcentrationLimits('AAPL', 5000, portfolioValue);
      expect(lowRisk.riskLevel).toBe('LOW');

      // 中リスク (10%)
      const medRisk = calculator.applyConcentrationLimits('AAPL', 10000, portfolioValue);
      expect(medRisk.riskLevel).toBe('MEDIUM');

      // 高リスク (20%)
      const highRisk = calculator.applyConcentrationLimits('AAPL', 20000, portfolioValue);
      expect(highRisk.riskLevel).toBe('HIGH');
    });
  });

  describe('完全な推奨計算', () => {
    it('Kelly + Volatility + Concentrationの統合計算', () => {
      const params: KellyParams = {
        winRate: 0.6,
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: 100000,
      };
      const symbol = 'AAPL';
      const atr = 0.03; // 3% volatility

      const result = calculator.getRecommendation(params, symbol, atr);

      expect(result.kellyResult).toBeDefined();
      expect(result.kellyResult.kellyPercentage).toBeGreaterThan(0);
      expect(result.volatilityAdjustment).toBeDefined();
      expect(result.finalSize).toBeGreaterThan(0);
      expect(result.finalSize).toBeLessThanOrEqual(20000); // 20% max
    });

    it('ATRなしでも動作する', () => {
      const params: KellyParams = {
        winRate: 0.55,
        avgWin: 150,
        avgLoss: 100,
        portfolioValue: 100000,
      };
      const symbol = 'AAPL';

      const result = calculator.getRecommendation(params, symbol);

      expect(result.kellyResult).toBeDefined();
      expect(result.volatilityAdjustment).toBeUndefined();
      expect(result.finalSize).toBeGreaterThan(0);
    });

    it('現在のポジションを考慮した計算', () => {
      const params: KellyParams = {
        winRate: 0.6,
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: 100000,
      };
      const symbol = 'AAPL';
      const currentPositions = [
        { symbol: 'MSFT', value: 30000 },
        { symbol: 'GOOGL', value: 5000 },
      ];

      const result = calculator.getRecommendation(params, symbol, 0.02, currentPositions);

      expect(result.finalSize).toBeGreaterThan(0);
      // セクター制限が適用される可能性
      expect(result.constraints).toBeDefined();
    });
  });

  describe('設定の更新', () => {
    it('Kelly fractionを更新できる', () => {
      calculator.setKellyFraction(0.25);
      const config = calculator.getConfig();
      expect(config.kellyFraction).toBe(0.25);
    });

    it('不正なKelly fractionはエラーを投げる', () => {
      expect(() => calculator.setKellyFraction(0)).toThrow();
      expect(() => calculator.setKellyFraction(1.5)).toThrow();
    });

    it('集中度制限を更新できる', () => {
      calculator.setConcentrationLimits({
        maxSinglePosition: 0.15,
        maxSectorExposure: 0.35,
      });
      
      const config = calculator.getConfig();
      expect(config.concentrationLimits.maxSinglePosition).toBe(0.15);
      expect(config.concentrationLimits.maxSectorExposure).toBe(0.35);
      // 他の値は保持される
      expect(config.concentrationLimits.minPositions).toBe(5);
    });
  });

  describe('信頼度とリスク評価', () => {
    it('高勝率・良好なリスクリワードで高信頼度', () => {
      const params: KellyParams = {
        winRate: 0.55,
        avgWin: 200,
        avgLoss: 100,
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('低勝率で低信頼度', () => {
      const params: KellyParams = {
        winRate: 0.40,
        avgWin: 300,
        avgLoss: 100,
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      // 3:1のリスクリワード比があっても40%勝率では中程度の信頼度
      expect(result.confidence).toBeLessThan(0.6);
      expect(result.warnings).toContain('Low win rate - exercise caution');
    });

    it('低リスクリワード比で警告', () => {
      const params: KellyParams = {
        winRate: 0.60,
        avgWin: 130,
        avgLoss: 100,
        portfolioValue: 100000,
      };

      const result = calculator.calculate(params);

      expect(result.warnings).toContain(
        'Low win/loss ratio - risk/reward may not be optimal'
      );
    });
  });
});
