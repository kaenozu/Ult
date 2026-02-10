/**
 * PortfolioRiskMonitor.ts
 *
 * TRADING-028: ポートフォリオリスク監視
 * VaR（価値atリスク）、相関関係の監視、セクター別エクスポージャー、
 * ストレステストを提供する高度なリスク監視システム
 */

import { Position, Portfolio } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface VaRResult {
  var95: number; // 95%信頼区間のVaR
  var99: number; // 99%信頼区間のVaR
  cvar95: number; // 95%条件付きVaR（Expected Shortfall）
  cvar99: number; // 99%条件付きVaR
  method: 'historical' | 'parametric' | 'montecarlo';
  timeHorizon: number; // 日数
}

export interface SectorExposure {
  sector: string;
  totalValue: number;
  percentOfPortfolio: number;
  positionCount: number;
  positions: {
    symbol: string;
    value: number;
    percent: number;
  }[];
}

export interface CorrelationPair {
  symbol1: string;
  symbol2: string;
  correlation: number;
  pValue: number; // 統計的有意性
}

export interface StressTestScenario {
  name: string;
  description: string;
  marketShock: number; // マーケットショック (%)
  volatilityMultiplier: number; // ボラティリティ倍率
  correlationIncrease: number; // 相関増加
}

export interface StressTestResult {
  scenario: StressTestScenario;
  portfolioImpact: number; // ポートフォリオへの影響額
  portfolioImpactPercent: number; // ポートフォリオへの影響率
  varImpact: number; // VaRへの影響
  worstCaseLoss: number; // 最悪ケースの損失
  positionImpacts: {
    symbol: string;
    impact: number;
    impactPercent: number;
  }[];
}

export interface RiskContribution {
  symbol: string;
  marginalVaR: number; // 限界VaR
  componentVaR: number; // 構成VaR
  percentOfPortfolioVaR: number; // ポートフォリオVaRへの寄与率
}

export interface PortfolioRiskReport {
  // VaRメトリクス
  dailyVar: VaRResult;
  weeklyVar: VaRResult;

  // セクターエクスポージャー
  sectorExposures: SectorExposure[];
  concentrationRisk: number; // 集中度リスク (0-1)

  // 相関分析
  correlationPairs: CorrelationPair[];
  avgCorrelation: number;
  maxCorrelation: number;

  // リスク寄与
  riskContributions: RiskContribution[];

  // ストレステスト
  stressTestResults: StressTestResult[];

  // ベータと systemic risk
  portfolioBeta: number;
  systemicRisk: number; // システム的リスク (0-1)

  // リスクスコア
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';

  // 警告
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// PortfolioRiskMonitor Class
// ============================================================================

export class PortfolioRiskMonitor {
  private returnsHistory: Map<string, number[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private portfolioHistory: number[] = [];
  private sectorMap: Map<string, string> = new Map();

  constructor() {
    this.initializeSectorMap();
  }

  /**
   * 包括的なポートフォリオリスクレポートを生成
   */
  generateRiskReport(portfolio: Portfolio, confidence: number = 95): PortfolioRiskReport {
    const totalValue = portfolio.totalValue + portfolio.cash;

    // VaR計算
    const dailyVar = this.calculateVaR(portfolio, confidence, 1);
    const weeklyVar = this.calculateVaR(portfolio, confidence, 5);

    // セクターエクスポージャー
    const sectorExposures = this.calculateSectorExposure(portfolio);
    const concentrationRisk = this.calculateConcentrationRisk(sectorExposures);

    // 相関分析
    const correlationPairs = this.calculateCorrelationPairs(portfolio);
    const avgCorrelation = this.calculateAverageCorrelation(correlationPairs);
    const maxCorrelation = this.calculateMaxCorrelation(correlationPairs);

    // リスク寄与
    const riskContributions = this.calculateRiskContributions(portfolio, dailyVar);

    // ストレステスト
    const stressTestResults = this.runStressTests(portfolio);

    // ベータとシステム的リスク
    const portfolioBeta = this.calculatePortfolioBeta(portfolio);
    const systemicRisk = this.calculateSystemicRisk(portfolio, correlationPairs);

    // 総合リスクスコア
    const overallRiskScore = this.calculateOverallRiskScore({
      dailyVar,
      concentrationRisk,
      avgCorrelation,
      systemicRisk,
      stressTestResults,
    });

    const riskLevel = this.determineRiskLevel(overallRiskScore);

    // 警告と推奨事項
    const { warnings, recommendations } = this.generateWarningsAndRecommendations({
      dailyVar,
      sectorExposures,
      correlationPairs,
      stressTestResults,
      overallRiskScore,
    });

    return {
      dailyVar,
      weeklyVar,
      sectorExposures,
      concentrationRisk,
      correlationPairs,
      avgCorrelation,
      maxCorrelation,
      riskContributions,
      stressTestResults,
      portfolioBeta,
      systemicRisk,
      overallRiskScore,
      riskLevel,
      warnings,
      recommendations,
    };
  }

  /**
   * VaRを計算
   */
  private calculateVaR(
    portfolio: Portfolio,
    confidence: number,
    timeHorizon: number
  ): VaRResult {
    const method = this.selectVaRMethod(portfolio);
    let var95: number;
    let var99: number;
    let cvar95: number;
    let cvar99: number;

    if (method === 'historical') {
      ({ var95, var99, cvar95, cvar99 } = this.calculateHistoricalVaR(portfolio, confidence));
    } else if (method === 'parametric') {
      ({ var95, var99, cvar95, cvar99 } = this.calculateParametricVaR(portfolio, confidence));
    } else {
      ({ var95, var99, cvar95, cvar99 } = this.calculateMonteCarloVaR(portfolio, confidence));
    }

    // 時間 horizon で調整 (平方根ルール)
    const timeAdjustment = Math.sqrt(timeHorizon);
    var95 *= timeAdjustment;
    var99 *= timeAdjustment;
    cvar95 *= timeAdjustment;
    cvar99 *= timeAdjustment;

    return {
      var95,
      var99,
      cvar95,
      cvar99,
      method,
      timeHorizon,
    };
  }

  /**
   * ヒストリカルVaR計算
   */
  private calculateHistoricalVaR(
    portfolio: Portfolio,
    confidence: number
  ): { var95: number; var99: number; cvar95: number; cvar99: number } {
    const returns = this.portfolioHistory;

    if (returns.length < 30) {
      // データ不足の場合はパラメトリック法にフォールバック
      return this.calculateParametricVaR(portfolio, confidence);
    }

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const totalValue = portfolio.totalValue + portfolio.cash;

    // VaR95 (5パーセンタイル)
    const index95 = Math.floor(sortedReturns.length * 0.05);
    const var95 = Math.abs(sortedReturns[index95]) * totalValue;

    // VaR99 (1パーセンタイル)
    const index99 = Math.floor(sortedReturns.length * 0.01);
    const var99 = Math.abs(sortedReturns[index99]) * totalValue;

    // CVaR95 (テールの平均)
    const tailReturns95 = sortedReturns.slice(0, index95);
    const cvar95 = tailReturns95.length > 0
      ? Math.abs(tailReturns95.reduce((sum, r) => sum + r, 0) / tailReturns95.length) * totalValue
      : var95;

    // CVaR99
    const tailReturns99 = sortedReturns.slice(0, index99);
    const cvar99 = tailReturns99.length > 0
      ? Math.abs(tailReturns99.reduce((sum, r) => sum + r, 0) / tailReturns99.length) * totalValue
      : var99;

    return { var95, var99, cvar95, cvar99 };
  }

  /**
   * パラメトリックVaR計算
   */
  private calculateParametricVaR(
    portfolio: Portfolio,
    confidence: number
  ): { var95: number; var99: number; cvar95: number; cvar99: number } {
    const totalValue = portfolio.totalValue + portfolio.cash;

    // ポートフォリオボラティリティを計算
    const volatility = this.calculatePortfolioVolatility(portfolio) / 100;

    // Z-score
    const z95 = 1.645;
    const z99 = 2.326;

    const var95 = totalValue * volatility * z95;
    const var99 = totalValue * volatility * z99;

    // CVaRの近似
    const cvar95 = var95 * (Math.exp(0.5 * z95 * z95) / 0.05) / z95;
    const cvar99 = var99 * (Math.exp(0.5 * z99 * z99) / 0.01) / z99;

    return { var95, var99, cvar95, cvar99 };
  }

  /**
   * モンテカルロVaR計算
   */
  private calculateMonteCarloVaR(
    portfolio: Portfolio,
    confidence: number
  ): { var95: number; var99: number; cvar95: number; cvar99: number } {
    const totalValue = portfolio.totalValue + portfolio.cash;
    const numSimulations = 10000;
    const timeHorizon = 1; // 1日

    // ポートフォリオの共分散行列を計算
    const covarianceMatrix = this.calculateCovarianceMatrix(portfolio);

    // モンテカルロシミュレーション
    const simulatedReturns: number[] = [];

    for (let i = 0; i < numSimulations; i++) {
      let portfolioReturn = 0;

      for (const position of portfolio.positions) {
        const positionWeight = (position.currentPrice * position.quantity) / totalValue;
        const returns = this.returnsHistory.get(position.symbol) || [];

        if (returns.length > 0) {
          // 正規分布から乱数を生成
          const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
          const std = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length);

          // Box-Muller変換で正規乱数を生成
          const u1 = Math.random();
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

          const simulatedReturn = mean + std * z;
          portfolioReturn += positionWeight * simulatedReturn;
        }
      }

      simulatedReturns.push(portfolioReturn);
    }

    // ソートしてパーセンタイルを計算
    simulatedReturns.sort((a, b) => a - b);

    const index95 = Math.floor(simulatedReturns.length * 0.05);
    const index99 = Math.floor(simulatedReturns.length * 0.01);

    const var95 = Math.abs(simulatedReturns[index95]) * totalValue;
    const var99 = Math.abs(simulatedReturns[index99]) * totalValue;

    // CVaR
    const tailReturns95 = simulatedReturns.slice(0, index95);
    const cvar95 = tailReturns95.reduce((sum, r) => sum + r, 0) / tailReturns95.length * -totalValue;

    const tailReturns99 = simulatedReturns.slice(0, index99);
    const cvar99 = tailReturns99.reduce((sum, r) => sum + r, 0) / tailReturns99.length * -totalValue;

    return { var95, var99, cvar95, cvar99 };
  }

  /**
   * セクターエクスポージャーを計算
   */
  private calculateSectorExposure(portfolio: Portfolio): SectorExposure[] {
    const sectorMap = new Map<string, SectorExposure>();
    const totalValue = portfolio.totalValue + portfolio.cash;

    for (const position of portfolio.positions) {
      const sector = this.sectorMap.get(position.symbol) || 'Other';

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, {
          sector,
          totalValue: 0,
          percentOfPortfolio: 0,
          positionCount: 0,
          positions: [],
        });
      }

      const exposure = sectorMap.get(sector)!;
      const positionValue = position.currentPrice * position.quantity;

      exposure.totalValue += positionValue;
      exposure.positionCount++;
      exposure.positions.push({
        symbol: position.symbol,
        value: positionValue,
        percent: (positionValue / totalValue) * 100,
      });
    }

    // キャッシュをセクターとして追加
    if (portfolio.cash > 0) {
      sectorMap.set('Cash', {
        sector: 'Cash',
        totalValue: portfolio.cash,
        percentOfPortfolio: (portfolio.cash / totalValue) * 100,
        positionCount: 0,
        positions: [],
      });
    }

    // パーセンテージを計算
    const exposures = Array.from(sectorMap.values());
    for (const exposure of exposures) {
      exposure.percentOfPortfolio = (exposure.totalValue / totalValue) * 100;
    }

    // 値順にソート
    return exposures.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * 集中度リスクを計算
   */
  private calculateConcentrationRisk(sectorExposures: SectorExposure[]): number {
    if (sectorExposures.length === 0) return 0;

    // Herfindahl-Hirschman Index (HHI)
    let hhi = 0;
    for (const exposure of sectorExposures) {
      const weight = exposure.percentOfPortfolio / 100;
      hhi += weight * weight;
    }

    // 0-1の範囲に正規化
    const n = sectorExposures.length;
    const minHHI = 1 / n;
    const maxHHI = 1;

    return n > 1 ? (hhi - minHHI) / (maxHHI - minHHI) : 1;
  }

  /**
   * 相関ペアを計算
   */
  private calculateCorrelationPairs(portfolio: Portfolio): CorrelationPair[] {
    const pairs: CorrelationPair[] = [];
    const positions = portfolio.positions;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const symbol1 = positions[i].symbol;
        const symbol2 = positions[j].symbol;

        const returns1 = this.returnsHistory.get(symbol1) || [];
        const returns2 = this.returnsHistory.get(symbol2) || [];

        if (returns1.length > 20 && returns2.length > 20) {
          const correlation = this.calculateCorrelation(returns1, returns2);
          const pValue = this.calculatePValue(correlation, returns1.length);

          pairs.push({
            symbol1,
            symbol2,
            correlation,
            pValue,
          });
        }
      }
    }

    return pairs;
  }

  /**
   * 平均相関を計算
   */
  private calculateAverageCorrelation(pairs: CorrelationPair[]): number {
    if (pairs.length === 0) return 0;

    const sum = pairs.reduce((total, pair) => total + Math.abs(pair.correlation), 0);
    return sum / pairs.length;
  }

  /**
   * 最大相関を計算
   */
  private calculateMaxCorrelation(pairs: CorrelationPair[]): number {
    if (pairs.length === 0) return 0;

    return Math.max(...pairs.map(pair => Math.abs(pair.correlation)));
  }

  /**
   * リスク寄与を計算
   */
  private calculateRiskContributions(portfolio: Portfolio, varResult: VaRResult): RiskContribution[] {
    const contributions: RiskContribution[] = [];
    const totalValue = portfolio.totalValue + portfolio.cash;

    for (const position of portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;
      const positionWeight = positionValue / totalValue;

      // ポジションボラティリティ
      const returns = this.returnsHistory.get(position.symbol) || [];
      const volatility = returns.length > 1
        ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
        : 0.02;

      // 限界VaR（簡略版）
      const marginalVaR = varResult.var95 * positionWeight * volatility / 0.02;

      // 構成VaR
      const componentVaR = marginalVaR * positionWeight;

      contributions.push({
        symbol: position.symbol,
        marginalVaR,
        componentVaR,
        percentOfPortfolioVaR: varResult.var95 > 0 ? (componentVaR / varResult.var95) * 100 : 0,
      });
    }

    return contributions;
  }

  /**
   * ストレステストを実行
   */
  private runStressTests(portfolio: Portfolio): StressTestResult[] {
    const scenarios: StressTestScenario[] = [
      {
        name: 'Market Crash',
        description: '2008年のような市場崩壊',
        marketShock: -30,
        volatilityMultiplier: 2.5,
        correlationIncrease: 0.3,
      },
      {
        name: 'Tech Bubble',
        description: 'テックバブル崩壊',
        marketShock: -20,
        volatilityMultiplier: 2.0,
        correlationIncrease: 0.2,
      },
      {
        name: 'Black Swan',
        description: 'ブラックスワンイベント',
        marketShock: -40,
        volatilityMultiplier: 3.0,
        correlationIncrease: 0.5,
      },
      {
        name: 'Moderate Correction',
        description: '中程度の調整',
        marketShock: -10,
        volatilityMultiplier: 1.5,
        correlationIncrease: 0.1,
      },
    ];

    const results: StressTestResult[] = [];

    for (const scenario of scenarios) {
      const result = this.applyStressTest(portfolio, scenario);
      results.push(result);
    }

    return results;
  }

  /**
   * 個別のストレステストを適用
   */
  private applyStressTest(portfolio: Portfolio, scenario: StressTestScenario): StressTestResult {
    const totalValue = portfolio.totalValue + portfolio.cash;
    const positionImpacts: StressTestResult['positionImpacts'] = [];
    let totalImpact = 0;

    for (const position of portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;

      // ボラティリティに基づく影響を計算
      const returns = this.returnsHistory.get(position.symbol) || [];
      const volatility = returns.length > 1
        ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
        : 0.02;

      const adjustedVolatility = volatility * scenario.volatilityMultiplier;
      const impact = positionValue * (scenario.marketShock / 100 + adjustedVolatility);

      totalImpact += impact;

      positionImpacts.push({
        symbol: position.symbol,
        impact,
        impactPercent: (impact / positionValue) * 100,
      });
    }

    return {
      scenario,
      portfolioImpact: totalImpact,
      portfolioImpactPercent: (totalImpact / totalValue) * 100,
      varImpact: Math.abs(totalImpact) * 1.645, // VaRの近似
      worstCaseLoss: Math.abs(totalImpact),
      positionImpacts,
    };
  }

  /**
   * ポートフォリオベータを計算
   */
  private calculatePortfolioBeta(portfolio: Portfolio): number {
    const totalValue = portfolio.totalValue + portfolio.cash;
    let portfolioBeta = 0;

    for (const position of portfolio.positions) {
      const positionWeight = (position.currentPrice * position.quantity) / totalValue;

      // 簡略化されたベータ計算（実際には市場データが必要）
      // ここではボラティリティに基づいて推定
      const returns = this.returnsHistory.get(position.symbol) || [];
      const volatility = returns.length > 1
        ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
        : 0.02;

      const beta = Math.min(2, Math.max(0.5, volatility / 0.015));
      portfolioBeta += positionWeight * beta;
    }

    return portfolioBeta;
  }

  /**
   * システム的リスクを計算
   */
  private calculateSystemicRisk(portfolio: Portfolio, correlationPairs: CorrelationPair[]): number {
    if (correlationPairs.length === 0) return 0;

    // 平均相関と集中度からシステム的リスクを推定
    const avgCorrelation = this.calculateAverageCorrelation(correlationPairs);

    return Math.min(1, avgCorrelation);
  }

  /**
   * 総合リスクスコアを計算
   */
  private calculateOverallRiskScore(params: {
    dailyVar: VaRResult;
    concentrationRisk: number;
    avgCorrelation: number;
    systemicRisk: number;
    stressTestResults: StressTestResult[];
  }): number {
    let score = 0;

    // VaRスコア (40点満点)
    const varPercent = (params.dailyVar.var95 / (params.dailyVar.var95 + 10000)) * 40;
    score += varPercent;

    // 集中度リスク (20点満点)
    score += params.concentrationRisk * 20;

    // 相関リスク (20点満点)
    score += params.avgCorrelation * 20;

    // ストレステスト (20点満点)
    const worstStressTest = Math.max(...params.stressTestResults.map(r => Math.abs(r.portfolioImpactPercent)));
    const stressScore = Math.min(20, worstStressTest / 2);
    score += stressScore;

    return Math.min(100, score);
  }

  /**
   * リスクレベルを判定
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'extreme';
  }

  /**
   * 警告と推奨事項を生成
   */
  private generateWarningsAndRecommendations(params: {
    dailyVar: VaRResult;
    sectorExposures: SectorExposure[];
    correlationPairs: CorrelationPair[];
    stressTestResults: StressTestResult[];
    overallRiskScore: number;
  }): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // VaR警告
    if (params.dailyVar.var95 > params.dailyVar.cvar95 * 0.8) {
      warnings.push('VaRがCVaRに近接 - テールリスクが高い可能性');
    }

    // セクター集中度警告
    const maxSectorExposure = Math.max(...params.sectorExposures.map(s => s.percentOfPortfolio));
    if (maxSectorExposure > 30) {
      warnings.push(`セクター集中度が高い (${maxSectorExposure.toFixed(1)}%)`);
      recommendations.push('セクターの分散を検討してください');
    }

    // 相関警告
    const highCorrelations = params.correlationPairs.filter(p => Math.abs(p.correlation) > 0.8);
    if (highCorrelations.length > 0) {
      warnings.push(`高相関ペアが${highCorrelations.length}組存在`);
      recommendations.push('逆相関または低相関の資産を追加してください');
    }

    // ストレステスト警告
    const severeScenarios = params.stressTestResults.filter(r => r.portfolioImpactPercent < -20);
    if (severeScenarios.length > 0) {
      warnings.push('深刻な市場ストレスシナリオで大きな損失の可能性');
      recommendations.push('ヘッジ戦略の導入を検討してください');
    }

    // 総合リスク警告
    if (params.overallRiskScore > 70) {
      warnings.push('総合リスクスコアが高い');
      recommendations.push('ポジションサイズの縮小を検討してください');
    }

    return { warnings, recommendations };
  }

  /**
   * VaRメソッドを選択
   */
  private selectVaRMethod(portfolio: Portfolio): 'historical' | 'parametric' | 'montecarlo' {
    const historyLength = this.portfolioHistory.length;

    if (historyLength >= 252) {
      return 'historical'; // 十分な履歴データがある場合
    } else if (portfolio.positions.length >= 5 && historyLength >= 30) {
      return 'parametric'; // 中程度のデータ
    } else {
      return 'parametric'; // データ不足時はパラメトリック法
    }
  }

  /**
   * ポートフォリオボラティリティを計算
   */
  private calculatePortfolioVolatility(portfolio: Portfolio): number {
    if (this.portfolioHistory.length < 2) return 20; // デフォルト20%

    const returns = this.portfolioHistory;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * Math.sqrt(252) * 100; // 年率
  }

  /**
   * 相関係数を計算
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      sumSqX += diffX * diffX;
      sumSqY += diffY * diffY;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * P値を計算
   */
  private calculatePValue(correlation: number, n: number): number {
    if (n < 3) return 1;

    const t = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
    // 簡略化されたP値計算
    return Math.max(0, 1 - t / 10);
  }

  /**
   * 共分散行列を計算
   */
  private calculateCovarianceMatrix(portfolio: Portfolio): number[][] {
    const n = portfolio.positions.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const returns1 = this.returnsHistory.get(portfolio.positions[i].symbol) || [];
        const returns2 = this.returnsHistory.get(portfolio.positions[j].symbol) || [];

        if (i === j) {
          // 分散
          matrix[i][j] = returns1.length > 1
            ? returns1.reduce((sum, r) => sum + r * r, 0) / returns1.length
            : 0.0004;
        } else {
          // 共分散
          const correlation = this.calculateCorrelation(returns1, returns2);
          const std1 = Math.sqrt(returns1.reduce((sum, r) => sum + r * r, 0) / returns1.length);
          const std2 = Math.sqrt(returns2.reduce((sum, r) => sum + r * r, 0) / returns2.length);
          matrix[i][j] = correlation * std1 * std2;
        }
      }
    }

    return matrix;
  }

  /**
   * セクターマップを初期化
   */
  private initializeSectorMap(): void {
    // 簡略化されたセクターマップ
    // 実際の実装ではデータベースやAPIから取得
    const sectors: { [key: string]: string } = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'META': 'Technology',
      'AMZN': 'Consumer Cyclical',
      'TSLA': 'Consumer Cyclical',
      'JPM': 'Financial',
      'BAC': 'Financial',
      'WFC': 'Financial',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
      'UNH': 'Healthcare',
      'XOM': 'Energy',
      'CVX': 'Energy',
    };

    for (const [symbol, sector] of Object.entries(sectors)) {
      this.sectorMap.set(symbol, sector);
    }
  }

  /**
   * リターン履歴を更新
   */
  updateReturns(symbol: string, returns: number[]): void {
    this.returnsHistory.set(symbol, returns);
  }

  /**
   * 価格履歴を更新
   */
  updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);

    // 最大252日分（1年分）を保持
    if (prices.length > 252) {
      prices.shift();
    }

    // リターンを計算して更新
    if (prices.length > 1) {
      const returns = this.returnsHistory.get(symbol) || [];
      const returnValue = (price - prices[prices.length - 2]) / prices[prices.length - 2];
      returns.push(returnValue);

      if (returns.length > 251) {
        returns.shift();
      }

      this.returnsHistory.set(symbol, returns);
    }
  }

  /**
   * ポートフォリオ履歴を更新
   */
  updatePortfolioHistory(totalValue: number): void {
    this.portfolioHistory.push(totalValue);

    if (this.portfolioHistory.length > 252) {
      this.portfolioHistory.shift();
    }
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.returnsHistory.clear();
    this.priceHistory.clear();
    this.portfolioHistory = [];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPortfolioRiskMonitor(): PortfolioRiskMonitor {
  return new PortfolioRiskMonitor();
}

export default PortfolioRiskMonitor;
