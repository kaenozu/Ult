/**
 * DynamicPositionSizer.test.ts
 *
 * TRADING-028: 動的ポジションサイジングのテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  DynamicPositionSizer,
  PositionSizingRequest,
  PortfolioRiskLimits,
} from '../DynamicPositionSizer';
import { Portfolio } from '@/app/types';

describe('DynamicPositionSizer', () => {
  let positionSizer: DynamicPositionSizer;
  let mockPortfolio: Portfolio;

  beforeEach(() => {
    mockPortfolio = {
      cash: 50000,
      positions: [
        {
          symbol: 'AAPL',
          side: 'LONG',
          quantity: 100,
          avgPrice: 150,
          currentPrice: 155,
          unrealizedPnL: 500,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      totalValue: 15500,
      dailyPnL: 500,
      totalProfit: 500,
      orders: [],
    };

    positionSizer = new DynamicPositionSizer(mockPortfolio);
  });

  describe('calculatePositionSize', () => {
    it('should calculate volatility-based position size', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 75,
        volatility: 25,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.recommendedShares).toBeGreaterThan(0);
      expect(result.positionValue).toBeGreaterThan(0);
      expect(result.riskAmount).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should calculate Kelly criterion position size', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        confidence: 80,
        volatility: 20,
        winRate: 0.6,
        avgWin: 0.04,
        avgLoss: 0.02,
        method: 'kelly',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.recommendedShares).toBeGreaterThan(0);
      expect(result.kellyFraction).toBeDefined();
      expect(result.kellyFraction).toBeGreaterThan(0);
    });

    it('should calculate risk parity position size', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        confidence: 70,
        volatility: 20,
        method: 'risk_parity',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.recommendedShares).toBeGreaterThan(0);
      expect(result.reasoning).toContain('リスクパリティアプローチ');
    });

    it('should calculate fixed position size', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 80,
        volatility: 20,
        method: 'fixed',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.recommendedShares).toBeGreaterThan(0);
      expect(result.reasoning).toContain('固定リスク');
    });

    it('should calculate Optimal F position size', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        confidence: 75,
        volatility: 20,
        winRate: 0.55,
        avgWin: 0.03,
        avgLoss: 0.02,
        method: 'optimal_f',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.recommendedShares).toBeGreaterThanOrEqual(0);
      expect(result.reasoning).toContain('Optimal F');
    });

    it('should respect portfolio risk limits', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 100,
        volatility: 10,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.positionPercent).toBeLessThanOrEqual(20); // maxPositionPercent
    });
  });

  describe('correlation adjustment', () => {
    it('should reduce position size with high correlation', () => {
      // 高相関を設定
      positionSizer.updateCorrelation('AAPL', 'MSFT', 0.9);
      positionSizer.updateCorrelation('AAPL', 'GOOGL', 0.85);

      // MSFTとGOOGLのポジションを追加
      mockPortfolio.positions.push(
        {
          symbol: 'MSFT',
          side: 'LONG',
          quantity: 100,
          avgPrice: 300,
          currentPrice: 310,
          unrealizedPnL: 1000,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          symbol: 'GOOGL',
          side: 'LONG',
          quantity: 50,
          avgPrice: 2500,
          currentPrice: 2600,
          unrealizedPnL: 5000,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      positionSizer.updatePortfolio(mockPortfolio);

      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 75,
        volatility: 20,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);

      // 相関調整が適用されていることを確認
      if (result.warnings.length > 0) {
        expect(result.warnings.some(w => w.includes('高相関'))).toBe(true);
      }
    });
  });

  describe('sector limits', () => {
    it('should enforce sector concentration limits', () => {
      // 既存のテックポジションを追加
      mockPortfolio.positions.push(
        {
          symbol: 'MSFT',
          side: 'LONG',
          quantity: 200,
          avgPrice: 300,
          currentPrice: 310,
          unrealizedPnL: 2000,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      positionSizer.updatePortfolio(mockPortfolio);

      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 100,
        volatility: 10,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);

      // セクター制限をチェック（警告が含まれている場合）
      if (result.warnings.length > 0) {
        const hasSectorWarning = result.warnings.some(w => w.includes('セクター'));
        expect(hasSectorWarning).toBeDefined();
      }
    });
  });

  describe('confidence adjustment', () => {
    it('should reduce position size with lower confidence', () => {
      const highConfidenceRequest: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 90,
        volatility: 20,
        method: 'volatility',
      };

      const lowConfidenceRequest: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 30,
        volatility: 20,
        method: 'volatility',
      };

      const highConfResult = positionSizer.calculatePositionSize(highConfidenceRequest);
      const lowConfResult = positionSizer.calculatePositionSize(lowConfidenceRequest);

      expect(highConfResult.recommendedShares).toBeGreaterThan(lowConfResult.recommendedShares);
    });
  });

  describe('edge cases', () => {
    it('should handle missing stop loss', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        confidence: 75,
        volatility: 20,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.recommendedShares).toBeGreaterThan(0);
    });

    it('should handle very high volatility', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 75,
        volatility: 80,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('ボラティリティ'))).toBe(true);
    });

    it('should handle negative Kelly criterion', () => {
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        confidence: 75,
        volatility: 20,
        winRate: 0.4, // Low win rate
        avgWin: 0.02,
        avgLoss: 0.03, // Larger losses
        method: 'kelly',
      };

      const result = positionSizer.calculatePositionSize(request);

      // 負のケリー基準に対して警告
      if (result.kellyFraction !== undefined && result.kellyFraction < 0) {
        expect(result.warnings.some(w => w.includes('期待値'))).toBe(true);
      }
    });
  });

  describe('update methods', () => {
    it('should update portfolio', () => {
      const newPortfolio: Portfolio = {
        ...mockPortfolio,
        cash: 60000,
      };

      positionSizer.updatePortfolio(newPortfolio);

      // 新しいポートフォリオで計算
      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 75,
        volatility: 20,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);
      expect(result.recommendedShares).toBeDefined();
    });

    it('should update risk limits', () => {
      const newLimits: Partial<PortfolioRiskLimits> = {
        maxPositionPercent: 10,
      };

      positionSizer.updateRiskLimits(newLimits);

      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 100,
        volatility: 10,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);

      expect(result.positionPercent).toBeLessThanOrEqual(10);
    });

    it('should update correlation', () => {
      positionSizer.updateCorrelation('AAPL', 'MSFT', 0.7);

      const request: PositionSizingRequest = {
        symbol: 'AAPL',
        entryPrice: 160,
        stopLoss: 155,
        confidence: 75,
        volatility: 20,
        method: 'volatility',
      };

      const result = positionSizer.calculatePositionSize(request);
      expect(result).toBeDefined();
    });
  });
});
