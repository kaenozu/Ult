/**
 * TailRiskHedging.test.ts
 *
 * TRADING-028: テイルリスクヘッジのテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  TailRiskHedging,
  HedgeRecommendation,
  TailRiskMetrics,
  HedgePortfolio,
} from '../TailRiskHedging';
import { Portfolio } from '@/app/types';

describe('TailRiskHedging', () => {
  let hedgeManager: TailRiskHedging;
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
        {
          symbol: 'MSFT',
          side: 'LONG',
          quantity: 50,
          avgPrice: 300,
          currentPrice: 310,
          unrealizedPnL: 500,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      totalValue: 31000,
      dailyPnL: 1000,
      totalProfit: 1000,
      orders: [],
    };

    hedgeManager = new TailRiskHedging(mockPortfolio);
  });

  describe('calculateTailRiskMetrics', () => {
    it('should calculate tail risk metrics', () => {
      const metrics = hedgeManager.calculateTailRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.skewness).toBeDefined();
      expect(metrics.kurtosis).toBeDefined();
      expect(metrics.tailRisk).toBeGreaterThanOrEqual(0);
      expect(metrics.tailRisk).toBeLessThanOrEqual(1);
      expect(metrics.expectedShortfall).toBeGreaterThan(0);
      expect(metrics.blackSwanProbability).toBeGreaterThan(0);
    });

    it('should handle portfolios with insufficient history', () => {
      // 履歴データが少ないポートフォリオ
      const smallPortfolio: Portfolio = {
        ...mockPortfolio,
        positions: [],
      };

      hedgeManager.updatePortfolio(smallPortfolio);
      const metrics = hedgeManager.calculateTailRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.tailRisk).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateHedgeRecommendations', () => {
    it('should generate multiple hedge strategies', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should include protective put recommendation', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const protectivePut = recommendations.find(
        r => r.strategy.id === 'protective-put'
      );

      expect(protectivePut).toBeDefined();
      expect(protectivePut!.strategy.type).toBe('options');
      expect(protectivePut!.options).toBeDefined();
      expect(protectivePut!.options!.length).toBeGreaterThan(0);
    });

    it('should include collar recommendation', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const collar = recommendations.find(r => r.strategy.id === 'collar');

      expect(collar).toBeDefined();
      expect(collar!.strategy.type).toBe('options');
      expect(collar!.options).toBeDefined();
    });

    it('should include put spread recommendation', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const putSpread = recommendations.find(r => r.strategy.id === 'put-spread');

      expect(putSpread).toBeDefined();
      expect(putSpread!.strategy.type).toBe('options');
    });

    it('should include inverse ETF recommendation', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const inverseETF = recommendations.find(r => r.strategy.id === 'inverse-etf');

      expect(inverseETF).toBeDefined();
      expect(inverseETF!.strategy.type).toBe('inverse_etf');
      expect(inverseETF!.inverseAssets).toBeDefined();
      expect(inverseETF!.inverseAssets!.length).toBeGreaterThan(0);
    });

    it('should include futures hedge for large portfolios', () => {
      const largePortfolio: Portfolio = {
        ...mockPortfolio,
        positions: [
          {
            symbol: 'AAPL',
            side: 'LONG',
            quantity: 10000,
            avgPrice: 150,
            currentPrice: 155,
            unrealizedPnL: 50000,
            realizedPnL: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalValue: 1550000,
      };

      hedgeManager.updatePortfolio(largePortfolio);
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const futures = recommendations.find(r => r.strategy.id === 'futures-hedge');

      expect(futures).toBeDefined();
      expect(futures!.strategy.type).toBe('futures');
      expect(futures!.futures).toBeDefined();
    });

    it('should not include futures for small portfolios', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const futures = recommendations.find(r => r.strategy.id === 'futures-hedge');

      expect(futures).toBeUndefined();
    });
  });

  describe('hedge recommendation properties', () => {
    it('should include strategy details', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      recommendations.forEach(rec => {
        expect(rec.strategy.id).toBeDefined();
        expect(rec.strategy.name).toBeDefined();
        expect(rec.strategy.type).toBeDefined();
        expect(rec.strategy.description).toBeDefined();
        expect(rec.strategy.cost).toBeGreaterThanOrEqual(0);
        expect(rec.strategy.protectionLevel).toBeGreaterThan(0);
        expect(rec.strategy.effectiveness).toBeGreaterThan(0);
        expect(rec.strategy.effectiveness).toBeLessThanOrEqual(100);
      });
    });

    it('should include reasoning', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      recommendations.forEach(rec => {
        expect(rec.reasoning).toBeDefined();
        expect(rec.reasoning.length).toBeGreaterThan(0);
      });
    });

    it('should include implementation steps', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      recommendations.forEach(rec => {
        expect(rec.implementationSteps).toBeDefined();
        expect(rec.implementationSteps.length).toBeGreaterThan(0);
      });
    });

    it('should calculate risk reduction', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      recommendations.forEach(rec => {
        expect(rec.riskReduction).toBeGreaterThanOrEqual(0);
        expect(rec.riskReduction).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate cost-benefit ratio', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      recommendations.forEach(rec => {
        expect(rec.costBenefitRatio).toBeGreaterThan(0);
      });
    });
  });

  describe('options hedge specifics', () => {
    it('should calculate option premiums correctly', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const optionsStrategies = recommendations.filter(r => r.options);

      optionsStrategies.forEach(strategy => {
        strategy.options!.forEach(option => {
          expect(option.underlying).toBeDefined();
          expect(option.strike).toBeGreaterThan(0);
          expect(option.premium).toBeGreaterThan(0);
          expect(option.contracts).toBeGreaterThan(0);
          expect(option.protectionPercent).toBeGreaterThan(0);
        });
      });
    });

    it('should set expiration dates', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const optionsStrategies = recommendations.filter(r => r.options);

      optionsStrategies.forEach(strategy => {
        strategy.options!.forEach(option => {
          expect(option.expiration).toBeDefined();
          expect(option.expiration).toBeInstanceOf(Date);
          expect(option.expiration.getTime()).toBeGreaterThan(Date.now());
        });
      });
    });
  });

  describe('inverse asset hedge specifics', () => {
    it('should include available inverse assets', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const inverseETF = recommendations.find(r => r.strategy.id === 'inverse-etf');

      expect(inverseETF).toBeDefined();
      expect(inverseETF!.inverseAssets).toBeDefined();

      inverseETF!.inverseAssets!.forEach(asset => {
        expect(asset.symbol).toBeDefined();
        expect(asset.name).toBeDefined();
        expect(asset.correlation).toBeLessThan(0);
        expect(asset.allocation).toBeGreaterThan(0);
        expect(asset.liquidity).toBeGreaterThan(0);
        expect(asset.liquidity).toBeLessThanOrEqual(100);
        expect(asset.expenseRatio).toBeGreaterThan(0);
      });
    });
  });

  describe('futures hedge specifics', () => {
    it('should calculate futures contracts correctly', () => {
      const largePortfolio: Portfolio = {
        ...mockPortfolio,
        totalValue: 200000,
        positions: [
          {
            symbol: 'AAPL',
            side: 'LONG',
            quantity: 1000,
            avgPrice: 150,
            currentPrice: 155,
            unrealizedPnL: 5000,
            realizedPnL: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      hedgeManager.updatePortfolio(largePortfolio);
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const futures = recommendations.find(r => r.strategy.id === 'futures-hedge');

      expect(futures).toBeDefined();
      expect(futures!.futures).toBeDefined();

      futures!.futures!.forEach(future => {
        expect(future.symbol).toBeDefined();
        expect(future.contractSize).toBeGreaterThan(0);
        expect(future.contracts).toBeGreaterThan(0);
        expect(future.margin).toBeGreaterThan(0);
        expect(future.hedgeRatio).toBeGreaterThan(0);
        expect(future.expiration).toBeInstanceOf(Date);
      });
    });
  });

  describe('getCurrentHedgePortfolio', () => {
    it('should return current hedge information', () => {
      // ヘッジポジションを追加
      const portfolioWithHedges: Portfolio = {
        ...mockPortfolio,
        positions: [
          ...mockPortfolio.positions,
          {
            symbol: 'AAPL_PUT',
            side: 'LONG',
            quantity: 1,
            avgPrice: 300,
            currentPrice: 350,
            unrealizedPnL: 50,
            realizedPnL: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      hedgeManager.updatePortfolio(portfolioWithHedges);
      const hedgePortfolio = hedgeManager.getCurrentHedgePortfolio();

      expect(hedgePortfolio).toBeDefined();
      expect(hedgePortfolio.currentHedges).toBeDefined();
      expect(hedgePortfolio.hedgeCost).toBeGreaterThanOrEqual(0);
      expect(hedgePortfolio.hedgeCoverage).toBeGreaterThanOrEqual(0);
      expect(hedgePortfolio.hedgeEffectiveness).toBeGreaterThanOrEqual(0);
      expect(hedgePortfolio.hedgeEffectiveness).toBeLessThanOrEqual(100);
    });

    it('should handle portfolio without hedges', () => {
      const hedgePortfolio = hedgeManager.getCurrentHedgePortfolio();

      expect(hedgePortfolio).toBeDefined();
      expect(hedgePortfolio.currentHedges.length).toBe(0);
      expect(hedgePortfolio.hedgeCost).toBe(0);
    });
  });

  describe('portfolio beta estimation', () => {
    it('should estimate portfolio beta', () => {
      // プライベートメソッドのテストは直接できないが、
      // ヘッジ推奨を通じて間接的にテスト可能
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const inverseETF = recommendations.find(r => r.strategy.id === 'inverse-etf');

      expect(inverseETF).toBeDefined();
      // ベータ推定に基づいて推奨が生成されている
    });

    it('should handle different sector betas', () => {
      const techPortfolio: Portfolio = {
        ...mockPortfolio,
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
      };

      hedgeManager.updatePortfolio(techPortfolio);
      const recommendations = hedgeManager.generateHedgeRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty portfolio', () => {
      const emptyPortfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 0,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      hedgeManager.updatePortfolio(emptyPortfolio);

      const recommendations = hedgeManager.generateHedgeRecommendations();

      // オプション戦略は生成されないが、逆相関ETFは生成される可能性がある
      const nonOptionsStrategies = recommendations.filter(r => r.strategy.type !== 'options');
      expect(nonOptionsStrategies.length).toBeGreaterThan(0);
    });

    it('should handle high tail risk scenarios', () => {
      // 高テイルリスクをシミュレート
      const recommendations = hedgeManager.generateHedgeRecommendations();

      const protectivePut = recommendations.find(r => r.strategy.id === 'protective-put');

      expect(protectivePut).toBeDefined();
      expect(protectivePut!.strategy.recommendation).toBeDefined();
    });
  });

  describe('update methods', () => {
    it('should update portfolio', () => {
      const newPortfolio: Portfolio = {
        ...mockPortfolio,
        cash: 60000,
      };

      hedgeManager.updatePortfolio(newPortfolio);

      const recommendations = hedgeManager.generateHedgeRecommendations();

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('recommendation priorities', () => {
    it('should sort recommendations by effectiveness', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          expect(recommendations[i].riskReduction).toBeGreaterThanOrEqual(
            recommendations[i + 1].riskReduction
          );
        }
      }
    });

    it('should provide recommendation levels', () => {
      const recommendations = hedgeManager.generateHedgeRecommendations();

      recommendations.forEach(rec => {
        expect(['highly_recommended', 'recommended', 'optional', 'not_recommended']).toContain(
          rec.strategy.recommendation
        );
      });
    });
  });
});
