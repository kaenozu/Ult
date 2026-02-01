/**
 * Portfolio Optimization Tests
 * 
 * Basic tests for portfolio optimization components
 */

import { describe, it, expect } from '@jest/globals';
import {
  ModernPortfolioTheory,
  BlackLitterman,
  RiskParity,
  FactorModeling,
  createDefaultMPTConfig,
  createDefaultBlackLittermanConfig,
  createDefaultRiskParityConfig,
  createDefaultFactorModelingConfig,
} from '../index';
import type { Asset, View } from '../types';

// Helper function to create mock asset data
function createMockAssets(count: number, returnLength: number): Asset[] {
  const assets: Asset[] = [];
  
  for (let i = 0; i < count; i++) {
    const returns: number[] = [];
    for (let j = 0; j < returnLength; j++) {
      // Generate random returns around 0 with small variance
      returns.push((Math.random() - 0.5) * 0.02);
    }
    
    assets.push({
      id: `asset-${i}`,
      symbol: `ASSET${i}`,
      name: `Asset ${i}`,
      sector: `Sector ${i % 3}`,
      returns,
      marketCap: Math.random() * 1000000000,
    });
  }
  
  return assets;
}

describe('ModernPortfolioTheory', () => {
  it('should calculate efficient frontier', () => {
    const config = createDefaultMPTConfig();
    const mpt = new ModernPortfolioTheory(config);
    const assets = createMockAssets(5, 252);
    
    const frontier = mpt.calculateEfficientFrontier(assets, 10);
    
    expect(frontier.portfolios.length).toBe(10);
    expect(frontier.minimumVariance).toBeDefined();
    expect(frontier.maximumSharpe).toBeDefined();
    expect(frontier.capitalMarketLine).toBeDefined();
  });

  it('should optimize portfolio for target return', () => {
    const config = createDefaultMPTConfig();
    const mpt = new ModernPortfolioTheory(config);
    const assets = createMockAssets(5, 252);
    
    const portfolio = mpt.optimizePortfolio(assets, 0.10); // 10% target return
    
    expect(portfolio.weights.length).toBe(5);
    expect(portfolio.expectedReturn).toBeDefined();
    expect(portfolio.standardDeviation).toBeGreaterThan(0);
    
    // Weights should sum to 1
    const sum = portfolio.weights.reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 2);
  });
});

describe('BlackLitterman', () => {
  it('should optimize with views', () => {
    const config = createDefaultBlackLittermanConfig();
    const bl = new BlackLitterman(config);
    const assets = createMockAssets(5, 252);
    
    const views: View[] = [
      {
        type: 'absolute',
        assets: ['ASSET0'],
        expectedReturn: 0.15,
        confidence: 0.8,
      },
      {
        type: 'relative',
        assets: ['ASSET1', 'ASSET2'],
        expectedReturn: 0.05,
        confidence: 0.6,
      },
    ];
    
    const result = bl.optimizeWithBlackLitterman(assets, views);
    
    expect(result.marketReturns.length).toBe(5);
    expect(result.adjustedReturns.length).toBe(5);
    expect(result.portfolio.weights.length).toBe(5);
  });

  it('should perform sensitivity analysis', () => {
    const config = createDefaultBlackLittermanConfig();
    const bl = new BlackLitterman(config);
    const assets = createMockAssets(3, 252);
    
    const views: View[] = [
      {
        type: 'absolute',
        assets: ['ASSET0'],
        expectedReturn: 0.12,
        confidence: 0.7,
      },
    ];
    
    const sensitivity = bl.performSensitivityAnalysis(assets, views, 0.1);
    
    expect(sensitivity.sensitivities.length).toBe(1);
    expect(sensitivity.baseResult).toBeDefined();
  });
});

describe('RiskParity', () => {
  it('should calculate risk parity portfolio', () => {
    const config = createDefaultRiskParityConfig();
    const rp = new RiskParity(config);
    const assets = createMockAssets(5, 252);
    
    const portfolio = rp.calculateRiskParityPortfolio(assets);
    
    expect(portfolio.weights.length).toBe(5);
    expect(portfolio.riskContributions.length).toBe(5);
    expect(portfolio.portfolioStats).toBeDefined();
    expect(portfolio.riskBudget).toBeDefined();
    
    // Check if risk contributions are roughly equal
    const riskPercentages = portfolio.riskContributions.map(rc => rc.riskPercentage);
    const avgRisk = riskPercentages.reduce((s, r) => s + r, 0) / riskPercentages.length;
    
    riskPercentages.forEach(risk => {
      expect(Math.abs(risk - avgRisk)).toBeLessThan(0.1); // Within 10% of average
    });
  });

  it('should calculate hierarchical risk parity', () => {
    const config = createDefaultRiskParityConfig();
    const rp = new RiskParity(config);
    const assets = createMockAssets(5, 252);
    
    const hrp = rp.calculateHierarchicalRiskParity(assets);
    
    expect(hrp.weights.length).toBe(5);
    expect(hrp.clusters.length).toBeGreaterThan(0);
    expect(hrp.dendrogram).toBeDefined();
  });
});

describe('FactorModeling', () => {
  it('should extract factors', () => {
    const config = createDefaultFactorModelingConfig();
    const fm = new FactorModeling(config);
    const assets = createMockAssets(10, 252);
    
    const factors = fm.extractFactors(assets);
    
    expect(factors.factors.length).toBeGreaterThan(0);
    expect(factors.factorReturns.length).toBeGreaterThan(0);
    expect(factors.factorCorrelations.length).toBeGreaterThan(0);
  });

  it('should estimate factor model for asset', () => {
    const config = createDefaultFactorModelingConfig();
    const fm = new FactorModeling(config);
    const assets = createMockAssets(10, 252);
    
    const extractionResult = fm.extractFactors(assets);
    const model = fm.estimateFactorModel(assets[0], extractionResult.factors);
    
    expect(model.assetId).toBe('asset-0');
    expect(model.factorSensitivities.length).toBe(extractionResult.factors.length);
    expect(model.alpha).toBeDefined();
    expect(model.rSquared).toBeGreaterThanOrEqual(0);
    expect(model.rSquared).toBeLessThanOrEqual(1);
  });

  it('should perform risk attribution', () => {
    const config = createDefaultFactorModelingConfig();
    const fm = new FactorModeling(config);
    const assets = createMockAssets(5, 252);
    
    const extractionResult = fm.extractFactors(assets);
    
    const factorModels = new Map();
    assets.forEach(asset => {
      const model = fm.estimateFactorModel(asset, extractionResult.factors);
      factorModels.set(asset.id, model);
    });
    
    const portfolio = {
      weights: Array(5).fill(0.2), // Equal weights
    };
    
    const attribution = fm.performRiskAttribution(portfolio, factorModels, extractionResult.factors);
    
    expect(attribution.totalRisk).toBeGreaterThan(0);
    expect(attribution.factorRisk.size).toBeGreaterThan(0);
    expect(attribution.specificRisk).toBeGreaterThanOrEqual(0);
  });
});

describe('Integration Tests', () => {
  it('should work with all optimization methods on the same data', () => {
    const assets = createMockAssets(5, 252);
    
    // MPT
    const mpt = new ModernPortfolioTheory(createDefaultMPTConfig());
    const mptPortfolio = mpt.optimizePortfolio(assets);
    expect(mptPortfolio.weights.length).toBe(5);
    
    // Black-Litterman
    const bl = new BlackLitterman(createDefaultBlackLittermanConfig());
    const views: View[] = [
      { type: 'absolute', assets: ['ASSET0'], expectedReturn: 0.12, confidence: 0.7 },
    ];
    const blResult = bl.optimizeWithBlackLitterman(assets, views);
    expect(blResult.portfolio.weights.length).toBe(5);
    
    // Risk Parity
    const rp = new RiskParity(createDefaultRiskParityConfig());
    const rpPortfolio = rp.calculateRiskParityPortfolio(assets);
    expect(rpPortfolio.weights.length).toBe(5);
    
    // All portfolios should have valid weights
    [mptPortfolio, blResult.portfolio, { weights: rpPortfolio.weights }].forEach(p => {
      p.weights.forEach(w => {
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      });
    });
  });
});
