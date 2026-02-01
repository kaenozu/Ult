# TRADING-003: リスク管理システムの高度化

## 概要
動的ポジションサイジングの実装、ポートフォリオ相関管理の強化、ストレステストエンジンの開発、心理管理自動化の導入を通じて、リスク管理システムを高度化します。

## 問題の説明
現在のシステムには以下の課題があります：

1. **静的なポジションサイジング**
   - 市場ボラティリティを考慮していない
   - 個別銘柄のリスクを無視している
   - ポートフォリオ全体のリスクを管理できない

2. **相関管理の不備**
   - 銘柄間の相関を考慮していない
   - 集中リスクの検出が不十分
   - ヘッジ戦略の最適化ができない

3. **ストレステストの欠如**
   - 極端な市場シナリオをシミュレーションできない
   - 最悪ケースの損失を予測できない
   - リスク耐性を評価できない

4. **心理管理の手動性**
   - トレーダーの心理状態を監視できない
   - 過度なリスクテイクを防げない
   - 感情的な取引を抑制できない

## 影響
- 不適切なリスクテイクによる損失
- ポートフォリオの集中リスク
- 市場ショック時の過剰損失
- トレーダーの感情的な判断ミス

## 推奨される解決策

### 1. 動的ポジションサイジングの実装

```typescript
// src/risk/DynamicPositionSizing.ts
import { MarketData, Position, Portfolio } from '@/types/trading';
import { RiskMetrics } from '@/types/risk';

export interface PositionSizingConfig {
  maxPositionSize: number; // 最大ポジションサイズ（ドル）
  maxPositionPercent: number; // ポートフォリオの最大パーセンテージ
  riskPerTrade: number; // 1取引あたりのリスク（パーセンテージ）
  maxRisk: number; // 最大リスク（ドル）
  volatilityAdjustment: boolean; // ボラティリティ調整の有無
  correlationAdjustment: boolean; // 相関調整の有無
}

export interface SizingResult {
  recommendedSize: number;
  riskAmount: number;
  stopLossDistance: number;
  confidence: number;
  reasons: string[];
}

export class DynamicPositionSizing {
  private config: PositionSizingConfig;
  private portfolio: Portfolio;
  private recentVolatility: Map<string, number> = new Map();

  constructor(config: PositionSizingConfig, portfolio: Portfolio) {
    this.config = config;
    this.portfolio = portfolio;
  }

  calculatePositionSize(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    marketData: MarketData
  ): SizingResult {
    const reasons: string[] = [];
    let recommendedSize = 0;
    let confidence = 1;

    // 基本サイズの計算
    const stopLossDistance = Math.abs(entryPrice - stopLoss);
    const riskPerShare = stopLossDistance;

    // リスクベースのサイズ計算
    const riskBasedSize = Math.min(
      this.config.maxRisk / riskPerShare,
      (this.portfolio.totalValue * this.config.riskPerTrade) / riskPerShare
    );

    recommendedSize = riskBasedSize;
    reasons.push(`リスクベースサイズ: ${riskBasedSize.toFixed(2)}株`);

    // ボラティリティ調整
    if (this.config.volatilityAdjustment) {
      const volatility = this.calculateVolatility(marketData);
      this.recentVolatility.set(symbol, volatility);

      const adjustedSize = this.adjustForVolatility(riskBasedSize, volatility);
      if (adjustedSize < recommendedSize) {
        recommendedSize = adjustedSize;
        reasons.push(`ボラティリティ調整: ${volatility.toFixed(2)}%`);
      }
    }

    // 最大サイズ制限
    const maxSizeByDollar = this.config.maxPositionSize / entryPrice;
    const maxSizeByPercent = (this.portfolio.totalValue * this.config.maxPositionPercent) / entryPrice;
    const maxSize = Math.min(maxSizeByDollar, maxSizeByPercent);

    if (recommendedSize > maxSize) {
      recommendedSize = maxSize;
      reasons.push(`最大サイズ制限: ${maxSize.toFixed(2)}株`);
      confidence *= 0.8;
    }

    // 相関調整
    if (this.config.correlationAdjustment) {
      const correlationAdjustment = this.adjustForCorrelation(symbol);
      if (correlationAdjustment < 1) {
        recommendedSize *= correlationAdjustment;
        reasons.push(`相関調整: ${(correlationAdjustment * 100).toFixed(1)}%`);
      }
    }

    // 既存ポジションの確認
    const existingPosition = this.portfolio.positions[symbol];
    if (existingPosition) {
      const totalSize = existingPosition.quantity + recommendedSize;
      if (totalSize > maxSize) {
        recommendedSize = Math.max(0, maxSize - existingPosition.quantity);
        reasons.push(`既存ポジション考慮`);
      }
    }

    return {
      recommendedSize: Math.floor(recommendedSize),
      riskAmount: recommendedSize * riskPerShare,
      stopLossDistance,
      confidence,
      reasons
    };
  }

  private calculateVolatility(marketData: MarketData): number {
    if (!marketData.ohlcv || marketData.ohlcv.history.length < 20) {
      return 0; // データ不足
    }

    const prices = marketData.ohlcv.history.slice(-20).map(d => d.close);
    const returns = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 年率化ボラティリティ（日次データの場合）
    return stdDev * Math.sqrt(252) * 100;
  }

  private adjustForVolatility(baseSize: number, volatility: number): number {
    // ボラティリティが高いほどサイズを小さくする
    const targetVolatility = 0.2; // 20%
    const adjustmentFactor = Math.min(1, targetVolatility / volatility);
    return baseSize * adjustmentFactor;
  }

  private adjustForCorrelation(symbol: string): number {
    // 既存ポジションとの相関を計算
    const correlations = this.calculateCorrelations(symbol);
    const avgCorrelation = correlations.reduce((sum, c) => sum + c, 0) / correlations.length;

    // 相関が高いほどサイズを小さくする
    return Math.max(0.3, 1 - avgCorrelation);
  }

  private calculateCorrelations(symbol: string): number[] {
    // 既存ポジションとの相関を計算（簡易版）
    const correlations: number[] = [];

    for (const existingSymbol of Object.keys(this.portfolio.positions)) {
      // 実際の実装ではヒストリカルデータから相関を計算
      // ここでは簡易的にセクターや業種に基づいて推定
      const correlation = this.estimateCorrelation(symbol, existingSymbol);
      correlations.push(correlation);
    }

    return correlations;
  }

  private estimateCorrelation(symbol1: string, symbol2: string): number {
    // セクターに基づいた相関推定（簡易版）
    const sector1 = this.getSymbolSector(symbol1);
    const sector2 = this.getSymbolSector(symbol2);

    if (sector1 === sector2) {
      return 0.7; // 同セクターは高い相関
    } else if (this.areRelatedSectors(sector1, sector2)) {
      return 0.4; // 関連セクターは中程度の相関
    }

    return 0.1; // その他は低い相関
  }

  private getSymbolSector(symbol: string): string {
    // 実際の実装ではデータベースから取得
    const sectorMap: { [key: string]: string } = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'JPM': 'Financial',
      'BAC': 'Financial',
      'XOM': 'Energy',
      'CVX': 'Energy'
    };

    return sectorMap[symbol] || 'Other';
  }

  private areRelatedSectors(sector1: string, sector2: string): boolean {
    const relatedSectors: { [key: string]: string[] } = {
      'Technology': ['Communication', 'Consumer Discretionary'],
      'Financial': ['Real Estate'],
      'Energy': ['Materials', 'Industrial']
    };

    return relatedSectors[sector1]?.includes(sector2) || relatedSectors[sector2]?.includes(sector1);
  }

  updateConfig(config: Partial<PositionSizingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
  }

  getVolatility(symbol: string): number | undefined {
    return this.recentVolatility.get(symbol);
  }
}
```

### 2. ポートフォリオ相関管理の強化

```typescript
// src/risk/PortfolioCorrelationManager.ts
import { Portfolio, Position } from '@/types/trading';
import { CorrelationMatrix, RiskContribution } from '@/types/risk';

export interface CorrelationAlert {
  level: 'warning' | 'critical';
  message: string;
  affectedPositions: string[];
  correlation: number;
}

export class PortfolioCorrelationManager {
  private correlationMatrix: CorrelationMatrix = {};
  private priceHistory: Map<string, number[]> = new Map();
  private maxHistoryLength = 252; // 1年分の日次データ

  updatePriceHistory(symbol: string, price: number): void {
    const history = this.priceHistory.get(symbol) || [];
    history.push(price);

    if (history.length > this.maxHistoryLength) {
      history.shift();
    }

    this.priceHistory.set(symbol, history);
  }

  calculateCorrelationMatrix(symbols: string[]): CorrelationMatrix {
    const matrix: CorrelationMatrix = {};

    for (const symbol1 of symbols) {
      matrix[symbol1] = {};

      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          matrix[symbol1][symbol2] = 1;
        } else {
          matrix[symbol1][symbol2] = this.calculateCorrelation(symbol1, symbol2);
        }
      }
    }

    this.correlationMatrix = matrix;
    return matrix;
  }

  private calculateCorrelation(symbol1: string, symbol2: string): number {
    const history1 = this.priceHistory.get(symbol1);
    const history2 = this.priceHistory.get(symbol2);

    if (!history1 || !history2 || history1.length < 20 || history2.length < 20) {
      return 0; // データ不足
    }

    // 同じ長さのデータを使用
    const minLength = Math.min(history1.length, history2.length);
    const prices1 = history1.slice(-minLength);
    const prices2 = history2.slice(-minLength);

    // リターンの計算
    const returns1 = this.calculateReturns(prices1);
    const returns2 = this.calculateReturns(prices2);

    // 相関係数の計算
    const n = returns1.length;
    const sum1 = returns1.reduce((sum, r) => sum + r, 0);
    const sum2 = returns2.reduce((sum, r) => sum + r, 0);
    const sum1Sq = returns1.reduce((sum, r) => sum + r * r, 0);
    const sum2Sq = returns2.reduce((sum, r) => sum + r * r, 0);
    const sum12 = returns1.reduce((sum, r, i) => sum + r * returns2[i], 0);

    const numerator = n * sum12 - sum1 * sum2;
    const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    return returns;
  }

  detectHighCorrelation(threshold: number = 0.8): CorrelationAlert[] {
    const alerts: CorrelationAlert[] = [];

    for (const [symbol1, correlations] of Object.entries(this.correlationMatrix)) {
      for (const [symbol2, correlation] of Object.entries(correlations)) {
        if (symbol1 >= symbol2) continue; // 重複を回避

        if (correlation > threshold) {
          alerts.push({
            level: correlation > 0.9 ? 'critical' : 'warning',
            message: `${symbol1} と ${symbol2} の相関が高いです: ${correlation.toFixed(2)}`,
            affectedPositions: [symbol1, symbol2],
            correlation
          });
        }
      }
    }

    return alerts;
  }

  calculateConcentrationRisk(portfolio: Portfolio): Map<string, number> {
    const concentrationRisk = new Map<string, number>();

    // セクター別の集中リスクを計算
    const sectorExposure = new Map<string, number>();

    for (const [symbol, position] of Object.entries(portfolio.positions)) {
      const sector = this.getSymbolSector(symbol);
      const exposure = position.value;

      sectorExposure.set(
        sector,
        (sectorExposure.get(sector) || 0) + exposure
      );
    }

    // パーセンテージに変換
    for (const [sector, exposure] of sectorExposure.entries()) {
      concentrationRisk.set(sector, (exposure / portfolio.totalValue) * 100);
    }

    return concentrationRisk;
  }

  calculateRiskContribution(portfolio: Portfolio): RiskContribution[] {
    const contributions: RiskContribution[] = [];

    for (const [symbol, position] of Object.entries(portfolio.positions)) {
      let marginalRisk = position.value / portfolio.totalValue;

      // 相関を考慮したリスク貢献度の調整
      for (const [otherSymbol, otherPosition] of Object.entries(portfolio.positions)) {
        if (symbol === otherSymbol) continue;

        const correlation = this.correlationMatrix[symbol]?.[otherSymbol] || 0;
        marginalRisk += (otherPosition.value / portfolio.totalValue) * correlation;
      }

      contributions.push({
        symbol,
        contribution: marginalRisk * 100,
        value: position.value,
        weight: (position.value / portfolio.totalValue) * 100
      });
    }

    return contributions.sort((a, b) => b.contribution - a.contribution);
  }

  suggestDiversification(portfolio: Portfolio): string[] {
    const suggestions: string[] = [];

    // 集中リスクのチェック
    const concentrationRisk = this.calculateConcentrationRisk(portfolio);
    for (const [sector, risk] of concentrationRisk.entries()) {
      if (risk > 30) {
        suggestions.push(`${sector}セクターの集中度が高いです（${risk.toFixed(1)}%）。分散投資を検討してください。`);
      }
    }

    // 高相関のチェック
    const highCorrelations = this.detectHighCorrelation(0.7);
    for (const alert of highCorrelations) {
      suggestions.push(alert.message);
    }

    // リスク貢献度のチェック
    const riskContributions = this.calculateRiskContribution(portfolio);
    if (riskContributions.length > 0 && riskContributions[0].contribution > 40) {
      suggestions.push(
        `${riskContributions[0].symbol}のリスク貢献度が高いです（${riskContributions[0].contribution.toFixed(1)}%）。ポジションサイズを再検討してください。`
      );
    }

    return suggestions;
  }

  private getSymbolSector(symbol: string): string {
    // 実際の実装ではデータベースから取得
    const sectorMap: { [key: string]: string } = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'JPM': 'Financial',
      'BAC': 'Financial',
      'XOM': 'Energy',
      'CVX': 'Energy'
    };

    return sectorMap[symbol] || 'Other';
  }

  getCorrelationMatrix(): CorrelationMatrix {
    return this.correlationMatrix;
  }

  clearHistory(): void {
    this.priceHistory.clear();
    this.correlationMatrix = {};
  }
}
```

### 3. ストレステストエンジンの開発

```typescript
// src/risk/StressTestEngine.ts
import { Portfolio, MarketData } from '@/types/trading';
import { StressScenario, StressTestResult } from '@/types/risk';

export interface StressTestConfig {
  scenarios: StressScenario[];
  confidenceLevels: number[];
  monteCarloSimulations: number;
}

export class StressTestEngine {
  private config: StressTestConfig;

  constructor(config: StressTestConfig) {
    this.config = config;
  }

  async runStressTest(
    portfolio: Portfolio,
    marketData: Map<string, MarketData>
  ): Promise<StressTestResult> {
    const scenarioResults: Array<{
      scenario: StressScenario;
      portfolioValue: number;
      loss: number;
      lossPercent: number;
    }> = [];

    // 各シナリオの実行
    for (const scenario of this.config.scenarios) {
      const result = this.applyScenario(portfolio, scenario, marketData);
      scenarioResults.push(result);
    }

    // モンテカルロシミュレーション
    const monteCarloResults = await this.runMonteCarloSimulation(portfolio, marketData);

    // VaRとCVaRの計算
    const varResults = this.calculateVaR(monteCarloResults, this.config.confidenceLevels);
    const cvarResults = this.calculateCVaR(monteCarloResults, this.config.confidenceLevels);

    // 最大ドローダウンの計算
    const maxDrawdown = this.calculateMaxDrawdown(monteCarloResults);

    return {
      scenarioResults,
      monteCarloResults,
      varResults,
      cvarResults,
      maxDrawdown,
      recommendations: this.generateRecommendations(scenarioResults, varResults, maxDrawdown)
    };
  }

  private applyScenario(
    portfolio: Portfolio,
    scenario: StressScenario,
    marketData: Map<string, MarketData>
  ): {
    scenario: StressScenario;
    portfolioValue: number;
    loss: number;
    lossPercent: number;
  } {
    let portfolioValue = 0;

    for (const [symbol, position] of Object.entries(portfolio.positions)) {
      const data = marketData.get(symbol);
      if (!data || !data.ohlcv) continue;

      // シナリオに基づいて価格を調整
      const adjustedPrice = this.adjustPrice(data.ohlcv.close, scenario, symbol);
      const positionValue = adjustedPrice * position.quantity;
      portfolioValue += positionValue;
    }

    const loss = portfolio.totalValue - portfolioValue;
    const lossPercent = (loss / portfolio.totalValue) * 100;

    return {
      scenario,
      portfolioValue,
      loss,
      lossPercent
    };
  }

  private adjustPrice(currentPrice: number, scenario: StressScenario, symbol: string): number {
    let adjustment = scenario.marketShock;

    // セクター固有の調整
    if (scenario.sectorShocks) {
      const sector = this.getSymbolSector(symbol);
      const sectorAdjustment = scenario.sectorShocks[sector] || 0;
      adjustment += sectorAdjustment;
    }

    // 銘柄固有の調整
    if (scenario.specificShocks) {
      const specificAdjustment = scenario.specificShocks[symbol] || 0;
      adjustment += specificAdjustment;
    }

    return currentPrice * (1 + adjustment);
  }

  private async runMonteCarloSimulation(
    portfolio: Portfolio,
    marketData: Map<string, MarketData>
  ): Promise<number[]> {
    const results: number[] = [];

    for (let i = 0; i < this.config.monteCarloSimulations; i++) {
      const scenario = this.generateRandomScenario();
      const result = this.applyScenario(portfolio, scenario, marketData);
      results.push(result.lossPercent);
    }

    return results.sort((a, b) => a - b);
  }

  private generateRandomScenario(): StressScenario {
    // 正規分布に基づいたランダムな市場ショック
    const mean = 0;
    const stdDev = 0.02; // 2%の標準偏差

    const marketShock = this.generateNormalRandom(mean, stdDev);

    return {
      name: 'Random Scenario',
      description: 'Monte Carlo simulation scenario',
      marketShock,
      sectorShocks: {},
      specificShocks: {}
    };
  }

  private generateNormalRandom(mean: number, stdDev: number): number {
    // Box-Muller変換
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return mean + stdDev * z;
  }

  private calculateVaR(results: number[], confidenceLevels: number[]): Map<number, number> {
    const varResults = new Map<number, number>();

    for (const confidence of confidenceLevels) {
      const index = Math.floor(results.length * (1 - confidence));
      varResults.set(confidence, results[index]);
    }

    return varResults;
  }

  private calculateCVaR(results: number[], confidenceLevels: number[]): Map<number, number> {
    const cvarResults = new Map<number, number>();

    for (const confidence of confidenceLevels) {
      const index = Math.floor(results.length * (1 - confidence));
      const tail = results.slice(0, index);
      const cvar = tail.reduce((sum, v) => sum + v, 0) / tail.length;
      cvarResults.set(confidence, cvar);
    }

    return cvarResults;
  }

  private calculateMaxDrawdown(results: number[]): number {
    let maxDrawdown = 0;

    for (let i = 0; i < results.length; i++) {
      const peak = Math.max(...results.slice(0, i + 1));
      const drawdown = peak - results[i];
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private generateRecommendations(
    scenarioResults: Array<{ scenario: StressScenario; lossPercent: number }>,
    varResults: Map<number, number>,
    maxDrawdown: number
  ): string[] {
    const recommendations: string[] = [];

    // シナリオ結果に基づく推奨事項
    const worstScenario = scenarioResults.reduce((worst, current) =>
      current.lossPercent > worst.lossPercent ? current : worst
    );

    if (worstScenario.lossPercent > 20) {
      recommendations.push(
        `最悪シナリオで${worstScenario.lossPercent.toFixed(1)}%の損失が予想されます。ポジションサイズの縮小を検討してください。`
      );
    }

    // VaRに基づく推奨事項
    const var95 = varResults.get(0.95);
    if (var95 && var95 > 10) {
      recommendations.push(
        `95% VaRが${var95.toFixed(1)}%を超えています。リスク許容度を見直してください。`
      );
    }

    // 最大ドローダウンに基づく推奨事項
    if (maxDrawdown > 15) {
      recommendations.push(
        `最大ドローダウンが${maxDrawdown.toFixed(1)}%と予想されます。ヘッジ戦略の導入を検討してください。`
      );
    }

    return recommendations;
  }

  private getSymbolSector(symbol: string): string {
    // 実際の実装ではデータベースから取得
    const sectorMap: { [key: string]: string } = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'JPM': 'Financial',
      'BAC': 'Financial',
      'XOM': 'Energy',
      'CVX': 'Energy'
    };

    return sectorMap[symbol] || 'Other';
  }

  updateConfig(config: Partial<StressTestConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
```

### 4. 心理管理自動化の導入

```typescript
// src/risk/PsychologyManager.ts
import { Trade, Portfolio } from '@/types/trading';
import { PsychologyMetrics, PsychologyAlert } from '@/types/risk';

export interface PsychologyConfig {
  maxDailyTrades: number;
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  coolingOffPeriod: number; // ミリ秒
  requiredBreakAfterLosses: number;
  maxRiskPerDay: number;
}

export class PsychologyManager {
  private config: PsychologyConfig;
  private todayTrades: Trade[] = [];
  private consecutiveLosses = 0;
  private lastLossTime: number | null = null;
  private inCoolingOffPeriod = false;
  private psychologyHistory: PsychologyMetrics[] = [];

  constructor(config: PsychologyConfig) {
    this.config = config;
  }

  recordTrade(trade: Trade): PsychologyAlert | null {
    const today = new Date().toDateString();
    const tradeDate = new Date(trade.timestamp).toDateString();

    // 日付が変わったらリセット
    if (tradeDate !== today) {
      this.resetDailyStats();
    }

    this.todayTrades.push(trade);

    // 損失のチェック
    if (trade.profit < 0) {
      this.consecutiveLosses++;
      this.lastLossTime = Date.now();

      // 連続損失のチェック
      if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
        return {
          level: 'critical',
          message: `連続${this.consecutiveLosses}回の損失が発生しました。取引を一時停止してください。`,
          action: 'pause-trading',
          duration: this.config.coolingOffPeriod
        };
      }
    } else if (trade.profit > 0) {
      this.consecutiveLosses = 0;
    }

    // 1日の取引回数のチェック
    if (this.todayTrades.length >= this.config.maxDailyTrades) {
      return {
        level: 'warning',
        message: `本日の取引回数が上限に達しました（${this.todayTrades.length}回）`,
        action: 'limit-trades',
        duration: 0
      };
    }

    // 1日の損失のチェック
    const dailyLoss = this.calculateDailyLoss();
    if (dailyLoss <= -this.config.maxDailyLoss) {
      return {
        level: 'critical',
        message: `本日の損失が上限に達しました（${dailyLoss.toFixed(2)}ドル）`,
        action: 'pause-trading',
        duration: this.config.coolingOffPeriod
      };
    }

    // クールダウン期間のチェック
    if (this.lastLossTime && Date.now() - this.lastLossTime < this.config.coolingOffPeriod) {
      return {
        level: 'warning',
        message: 'クールダウン期間中です。取引をお控えください。',
        action: 'cooling-off',
        duration: this.config.coolingOffPeriod - (Date.now() - (this.lastLossTime || 0))
      };
    }

    return null;
  }

  canTrade(portfolio: Portfolio): { allowed: boolean; reason?: string } {
    // クールダウン期間のチェック
    if (this.inCoolingOffPeriod) {
      return {
        allowed: false,
        reason: 'クールダウン期間中です'
      };
    }

    // 1日のリスクのチェック
    const dailyRisk = this.calculateDailyRisk(portfolio);
    if (dailyRisk > this.config.maxRiskPerDay) {
      return {
        allowed: false,
        reason: `本日のリスクが上限に達しています（${dailyRisk.toFixed(1)}%）`
      };
    }

    // 連続損失のチェック
    if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      return {
        allowed: false,
        reason: `連続${this.consecutiveLosses}回の損失が発生しています`
      };
    }

    return { allowed: true };
  }

  calculatePsychologyMetrics(): PsychologyMetrics {
    const metrics: PsychologyMetrics = {
      date: new Date().toDateString(),
      totalTrades: this.todayTrades.length,
      winningTrades: this.todayTrades.filter(t => t.profit > 0).length,
      losingTrades: this.todayTrades.filter(t => t.profit < 0).length,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      averageWin: 0,
      averageLoss: 0,
      consecutiveLosses: this.consecutiveLosses,
      consecutiveWins: this.calculateConsecutiveWins(),
      emotionalState: this.assessEmotionalState(),
      riskLevel: this.assessRiskLevel()
    };

    if (this.todayTrades.length > 0) {
      metrics.winRate = metrics.winningTrades / this.todayTrades.length;
      metrics.totalProfit = this.todayTrades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
      metrics.totalLoss = Math.abs(this.todayTrades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
      metrics.netProfit = metrics.totalProfit - metrics.totalLoss;
      metrics.averageWin = metrics.winningTrades > 0 ? metrics.totalProfit / metrics.winningTrades : 0;
      metrics.averageLoss = metrics.losingTrades > 0 ? metrics.totalLoss / metrics.losingTrades : 0;
    }

    // 履歴に追加
    this.psychologyHistory.push(metrics);
    if (this.psychologyHistory.length > 30) {
      this.psychologyHistory.shift();
    }

    return metrics;
  }

  private calculateDailyLoss(): number {
    return this.todayTrades.reduce((sum, trade) => sum + Math.min(0, trade.profit), 0);
  }

  private calculateDailyRisk(portfolio: Portfolio): number {
    const dailyLoss = Math.abs(this.calculateDailyLoss());
    return (dailyLoss / portfolio.totalValue) * 100;
  }

  private calculateConsecutiveWins(): number {
    let consecutiveWins = 0;

    for (let i = this.todayTrades.length - 1; i >= 0; i--) {
      if (this.todayTrades[i].profit > 0) {
        consecutiveWins++;
      } else {
        break;
      }
    }

    return consecutiveWins;
  }

  private assessEmotionalState(): 'calm' | 'alert' | 'stressed' | 'panicked' {
    const metrics = this.calculatePsychologyMetrics();

    // 損失が大きい場合
    if (metrics.totalLoss > metrics.totalProfit * 2) {
      return 'panicked';
    }

    // 連続損失が多い場合
    if (metrics.consecutiveLosses >= 3) {
      return 'stressed';
    }

    // 取引回数が多い場合
    if (metrics.totalTrades > this.config.maxDailyTrades * 0.8) {
      return 'alert';
    }

    return 'calm';
  }

  private assessRiskLevel(): 'low' | 'medium' | 'high' | 'extreme' {
    const emotionalState = this.assessEmotionalState();

    switch (emotionalState) {
      case 'panicked':
        return 'extreme';
      case 'stressed':
        return 'high';
      case 'alert':
        return 'medium';
      default:
        return 'low';
    }
  }

  startCoolingOffPeriod(): void {
    this.inCoolingOffPeriod = true;

    setTimeout(() => {
      this.inCoolingOffPeriod = false;
      this.consecutiveLosses = 0;
    }, this.config.coolingOffPeriod);
  }

  resetDailyStats(): void {
    this.todayTrades = [];
    this.consecutiveLosses = 0;
    this.lastLossTime = null;
  }

  updateConfig(config: Partial<PsychologyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getPsychologyHistory(): PsychologyMetrics[] {
    return [...this.psychologyHistory];
  }
}
```

## 実装計画

### フェーズ1: 動的ポジションサイジング（2週間）
- [ ] ボラティリティ計算の実装
- [ ] リスクベースサイジングの実装
- [ ] 相関調整の実装
- [ ] 制限チェックの実装
- [ ] ユニットテストの作成

### フェーズ2: ポートフォリオ相関管理（2週間）
- [ ] 相関行列の計算
- [ ] 高相関検出の実装
- [ ] 集中リスクの計算
- [ ] リスク貢献度の計算
- [ ] 統合テストの作成

### フェーズ3: ストレステストエンジン（2週間）
- [ ] シナリオ適用の実装
- [ ] モンテカルロシミュレーション
- [ ] VaR/CVaRの計算
- [ ] 推奨事項の生成
- [ ] パフォーマンステストの作成

### フェーズ4: 心理管理自動化（2週間）
- [ ] 取引記録の実装
- [ ] 心理状態の評価
- [ ] アラートシステムの構築
- [ ] クールダウン機能の実装
- [ ] E2Eテストの作成

## 成功基準
- 動的ポジションサイジングの精度90%以上
- 高相関検出の精度95%以上
- ストレステストの予測誤差10%以下
- 心理管理アラートの適合率90%以上

## 関連Issue
- TRADING-001: データ品質と信頼性の向上
- TRADING-002: 取引戦略とシグナル生成の精度向上

## ラベル
enhancement, risk-management, priority:high
