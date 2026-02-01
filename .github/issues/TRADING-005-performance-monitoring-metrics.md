# TRADING-005: パフォーマンス監視とメトリクスの強化

## 概要
高度なパフォーマンスメトリクスの実装、リアルタイム監視システムの構築、詳細な分析機能の追加、レポート生成システムの開発を通じて、パフォーマンス監視とメトリクスを強化します。

## 問題の説明
現在のシステムには以下の課題があります：

1. **メトリクスの不備**
   - 基本的なパフォーマンス指標のみ
   - リスク調整済みリターンの計算がない
   - 取引品質の評価が不十分

2. **リアルタイム監視の不足**
   - リアルタイムのパフォーマンス追跡がない
   - アラートシステムが不十分
   - ダッシュボードの情報が限定的

3. **分析機能の欠如**
   - 詳細なパフォーマンス分析がない
   - 取引パターンの分析ができない
   - 改善提案の生成がない

4. **レポート生成の手動性**
   - 自動レポート生成がない
   - カスタマイズ可能なレポートがない
   - 履歴データの追跡が不十分

## 影響
- パフォーマンスの可視化不足
- 問題の早期発見の遅れ
- 改善活動の非効率化
- ステークホルダーへの報告の不備

## 推奨される解決策

### 1. 高度なパフォーマンスメトリクスの実装

```typescript
// src/performance/PerformanceMetrics.ts
import { Trade, Portfolio } from '@/types/trading';

export interface PerformanceMetrics {
  // 基本メトリクス
  totalReturn: number;
  annualizedReturn: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;

  // リスク調整済みメトリクス
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  treynorRatio: number;

  // リスクメトリクス
  maxDrawdown: number;
  averageDrawdown: number;
  volatility: number;
  downsideDeviation: number;
  valueAtRisk: number;
  conditionalValueAtRisk: number;

  // 取引品質メトリクス
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  averageWinLossRatio: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingPeriod: number;
  averageRMultiple: number;

  // 効率性メトリクス
  expectancy: number;
  kellyCriterion: number;
  riskOfRuin: number;
  SQN: number; // System Quality Number
}

export class PerformanceMetricsCalculator {
  private riskFreeRate = 0.02; // 2%の無リスク金利

  calculateMetrics(trades: Trade[], portfolio: Portfolio): PerformanceMetrics {
    const tradePairs = this.pairTrades(trades);
    const returns = this.calculateReturns(tradePairs, portfolio);

    return {
      // 基本メトリクス
      totalReturn: this.calculateTotalReturn(portfolio),
      annualizedReturn: this.calculateAnnualizedReturn(portfolio, returns),
      totalTrades: tradePairs.length,
      winningTrades: tradePairs.filter(t => t.profit > 0).length,
      losingTrades: tradePairs.filter(t => t.profit < 0).length,
      winRate: this.calculateWinRate(tradePairs),

      // リスク調整済みメトリクス
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(portfolio, returns),
      informationRatio: this.calculateInformationRatio(returns, this.riskFreeRate),
      treynorRatio: this.calculateTreynorRatio(returns, this.calculateBeta(returns)),

      // リスクメトリクス
      maxDrawdown: this.calculateMaxDrawdown(portfolio),
      averageDrawdown: this.calculateAverageDrawdown(portfolio),
      volatility: this.calculateVolatility(returns),
      downsideDeviation: this.calculateDownsideDeviation(returns),
      valueAtRisk: this.calculateVaR(returns, 0.95),
      conditionalValueAtRisk: this.calculateCVaR(returns, 0.95),

      // 取引品質メトリクス
      profitFactor: this.calculateProfitFactor(tradePairs),
      averageWin: this.calculateAverageWin(tradePairs),
      averageLoss: this.calculateAverageLoss(tradePairs),
      averageWinLossRatio: this.calculateAverageWinLossRatio(tradePairs),
      largestWin: this.calculateLargestWin(tradePairs),
      largestLoss: this.calculateLargestLoss(tradePairs),
      averageHoldingPeriod: this.calculateAverageHoldingPeriod(tradePairs),
      averageRMultiple: this.calculateAverageRMultiple(tradePairs),

      // 効率性メトリクス
      expectancy: this.calculateExpectancy(tradePairs),
      kellyCriterion: this.calculateKellyCriterion(tradePairs),
      riskOfRuin: this.calculateRiskOfRuin(tradePairs),
      SQN: this.calculateSQN(tradePairs)
    };
  }

  private pairTrades(trades: Trade[]): Array<{ profit: number; entryTime: number; exitTime: number; initialRisk: number }> {
    const pairs: Array<{ profit: number; entryTime: number; exitTime: number; initialRisk: number }> = [];
    let entry: Trade | null = null;

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        entry = trade;
      } else if (trade.type === 'SELL' && entry) {
        const profit = (trade.price - entry.price) * entry.quantity - entry.commission - trade.commission;
        pairs.push({
          profit,
          entryTime: entry.timestamp,
          exitTime: trade.timestamp,
          initialRisk: entry.stopLoss ? Math.abs(entry.price - entry.stopLoss) * entry.quantity : 0
        });
        entry = null;
      }
    }

    return pairs;
  }

  private calculateReturns(tradePairs: Array<{ profit: number }>, portfolio: Portfolio): number[] {
    return tradePairs.map(t => t.profit / portfolio.initialValue);
  }

  private calculateTotalReturn(portfolio: Portfolio): number {
    return (portfolio.currentValue - portfolio.initialValue) / portfolio.initialValue;
  }

  private calculateAnnualizedReturn(portfolio: Portfolio, returns: number[]): number {
    const totalReturn = this.calculateTotalReturn(portfolio);
    const days = (Date.now() - portfolio.createdAt) / (1000 * 60 * 60 * 24);
    const years = days / 365;

    if (years <= 0) return 0;

    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }

  private calculateWinRate(tradePairs: Array<{ profit: number }>): number {
    if (tradePairs.length === 0) return 0;

    const winningTrades = tradePairs.filter(t => t.profit > 0).length;
    return winningTrades / tradePairs.length;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const excessReturns = returns.map(r => r - this.riskFreeRate / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const stdDev = this.calculateStandardDeviation(excessReturns);

    return stdDev > 0 ? avgExcessReturn / stdDev : 0;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const excessReturns = returns.map(r => r - this.riskFreeRate / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const downsideReturns = excessReturns.filter(r => r < 0);
    const downsideDeviation = this.calculateStandardDeviation(downsideReturns);

    return downsideDeviation > 0 ? avgExcessReturn / downsideDeviation : 0;
  }

  private calculateCalmarRatio(portfolio: Portfolio, returns: number[]): number {
    const annualizedReturn = this.calculateAnnualizedReturn(portfolio, returns);
    const maxDrawdown = this.calculateMaxDrawdown(portfolio);

    return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  }

  private calculateInformationRatio(returns: number[], benchmarkReturn: number): number {
    if (returns.length === 0) return 0;

    const excessReturns = returns.map(r => r - benchmarkReturn);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const trackingError = this.calculateStandardDeviation(excessReturns);

    return trackingError > 0 ? avgExcessReturn / trackingError : 0;
  }

  private calculateTreynorRatio(returns: number[], beta: number): number {
    if (beta === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const excessReturn = avgReturn - this.riskFreeRate;

    return excessReturn / beta;
  }

  private calculateMaxDrawdown(portfolio: Portfolio): number {
    let maxDrawdown = 0;
    let peak = portfolio.initialValue;

    for (const snapshot of portfolio.history) {
      peak = Math.max(peak, snapshot.value);
      const drawdown = (peak - snapshot.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateAverageDrawdown(portfolio: Portfolio): number {
    const drawdowns: number[] = [];
    let peak = portfolio.initialValue;

    for (const snapshot of portfolio.history) {
      peak = Math.max(peak, snapshot.value);
      const drawdown = (peak - snapshot.value) / peak;
      if (drawdown > 0) {
        drawdowns.push(drawdown);
      }
    }

    return drawdowns.length > 0
      ? drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length
      : 0;
  }

  private calculateVolatility(returns: number[]): number {
    return this.calculateStandardDeviation(returns) * Math.sqrt(252);
  }

  private calculateDownsideDeviation(returns: number[]): number {
    const downsideReturns = returns.filter(r => r < 0);
    return this.calculateStandardDeviation(downsideReturns) * Math.sqrt(252);
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (1 - confidence));

    return -sorted[index];
  }

  private calculateCVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (1 - confidence));
    const tail = sorted.slice(0, index);

    return tail.length > 0
      ? -tail.reduce((sum, r) => sum + r, 0) / tail.length
      : 0;
  }

  private calculateProfitFactor(tradePairs: Array<{ profit: number }>): number {
    const grossProfit = tradePairs.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(tradePairs.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));

    return grossLoss > 0 ? grossProfit / grossLoss : 0;
  }

  private calculateAverageWin(tradePairs: Array<{ profit: number }>): number {
    const wins = tradePairs.filter(t => t.profit > 0);
    return wins.length > 0
      ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length
      : 0;
  }

  private calculateAverageLoss(tradePairs: Array<{ profit: number }>): number {
    const losses = tradePairs.filter(t => t.profit < 0);
    return losses.length > 0
      ? losses.reduce((sum, t) => sum + t.profit, 0) / losses.length
      : 0;
  }

  private calculateAverageWinLossRatio(tradePairs: Array<{ profit: number }>): number {
    const avgWin = this.calculateAverageWin(tradePairs);
    const avgLoss = Math.abs(this.calculateAverageLoss(tradePairs));

    return avgLoss > 0 ? avgWin / avgLoss : 0;
  }

  private calculateLargestWin(tradePairs: Array<{ profit: number }>): number {
    return Math.max(...tradePairs.map(t => t.profit), 0);
  }

  private calculateLargestLoss(tradePairs: Array<{ profit: number }>): number {
    return Math.min(...tradePairs.map(t => t.profit), 0);
  }

  private calculateAverageHoldingPeriod(tradePairs: Array<{ entryTime: number; exitTime: number }>): number {
    if (tradePairs.length === 0) return 0;

    const totalHoldingTime = tradePairs.reduce(
      (sum, t) => sum + (t.exitTime - t.entryTime),
      0
    );

    return totalHoldingTime / tradePairs.length / (1000 * 60 * 60 * 24); // 日数
  }

  private calculateAverageRMultiple(tradePairs: Array<{ profit: number; initialRisk: number }>): number {
    const rMultiples = tradePairs
      .filter(t => t.initialRisk > 0)
      .map(t => t.profit / t.initialRisk);

    return rMultiples.length > 0
      ? rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length
      : 0;
  }

  private calculateExpectancy(tradePairs: Array<{ profit: number }>): number {
    if (tradePairs.length === 0) return 0;

    const totalProfit = tradePairs.reduce((sum, t) => sum + t.profit, 0);
    return totalProfit / tradePairs.length;
  }

  private calculateKellyCriterion(tradePairs: Array<{ profit: number }>): number {
    const winRate = this.calculateWinRate(tradePairs);
    const avgWin = this.calculateAverageWin(tradePairs);
    const avgLoss = Math.abs(this.calculateAverageLoss(tradePairs));

    if (avgLoss === 0) return 0;

    return winRate - ((1 - winRate) * (avgWin / avgLoss));
  }

  private calculateRiskOfRuin(tradePairs: Array<{ profit: number }>): number {
    const winRate = this.calculateWinRate(tradePairs);
    const avgWin = this.calculateAverageWin(tradePairs);
    const avgLoss = Math.abs(this.calculateAverageLoss(tradePairs));

    if (avgLoss === 0) return 0;

    const q = 1 - winRate;
    const p = winRate;
    const r = avgWin / avgLoss;

    if (p > q) {
      return 0; // 正の期待値の場合、破産リスクは0
    }

    return Math.pow((q / p), r);
  }

  private calculateSQN(tradePairs: Array<{ profit: number }>): number {
    if (tradePairs.length === 0) return 0;

    const expectancy = this.calculateExpectancy(tradePairs);
    const stdDev = this.calculateStandardDeviation(tradePairs.map(t => t.profit));

    return stdDev > 0 ? (expectancy / stdDev) * Math.sqrt(tradePairs.length) : 0;
  }

  private calculateBeta(returns: number[]): number {
    // 市場ベータの計算（簡易版）
    // 実際の実装では市場インデックスとの相関を計算
    return 1;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  setRiskFreeRate(rate: number): void {
    this.riskFreeRate = rate;
  }
}
```

### 2. リアルタイム監視システムの構築

```typescript
// src/performance/RealTimeMonitor.ts
import { EventEmitter } from 'events';
import { Trade, Portfolio } from '@/types/trading';

export interface MonitoringAlert {
  level: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  timestamp: number;
  data?: any;
}

export interface MonitoringMetrics {
  timestamp: number;
  portfolioValue: number;
  dailyPnL: number;
  dailyReturn: number;
  openPositions: number;
  activeOrders: number;
  unrealizedPnL: number;
  riskExposure: number;
}

export class RealTimeMonitor extends EventEmitter {
  private portfolio: Portfolio;
  private alerts: MonitoringAlert[] = [];
  private maxAlerts = 100;
  private metricsHistory: MonitoringMetrics[] = [];
  private maxHistoryLength = 1440; // 24時間分（1分間隔）

  private thresholds = {
    maxDailyLoss: 0.05, // 5%
    maxDrawdown: 0.10, // 10%
    maxPositions: 20,
    maxRiskExposure: 0.80 // 80%
  };

  constructor(portfolio: Portfolio) {
    super();
    this.portfolio = portfolio;
  }

  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
    this.checkThresholds();
    this.recordMetrics();
  }

  recordTrade(trade: Trade): void {
    this.checkTradeAlerts(trade);
  }

  private checkThresholds(): void {
    const metrics = this.calculateCurrentMetrics();

    // 1日の損失のチェック
    if (metrics.dailyReturn < -this.thresholds.maxDailyLoss) {
      this.emitAlert({
        level: 'critical',
        type: 'daily-loss',
        message: `1日の損失が${(metrics.dailyReturn * 100).toFixed(1)}%に達しました`,
        timestamp: Date.now(),
        data: metrics
      });
    }

    // ドローダウンのチェック
    const maxDrawdown = this.calculateMaxDrawdown();
    if (maxDrawdown > this.thresholds.maxDrawdown) {
      this.emitAlert({
        level: 'warning',
        type: 'max-drawdown',
        message: `最大ドローダウンが${(maxDrawdown * 100).toFixed(1)}%を超えました`,
        timestamp: Date.now(),
        data: { maxDrawdown }
      });
    }

    // ポジション数のチェック
    if (metrics.openPositions > this.thresholds.maxPositions) {
      this.emitAlert({
        level: 'warning',
        type: 'max-positions',
        message: `オープンポジション数が${metrics.openPositions}に達しました`,
        timestamp: Date.now(),
        data: { openPositions: metrics.openPositions }
      });
    }

    // リスクエクスポージャーのチェック
    if (metrics.riskExposure > this.thresholds.maxRiskExposure) {
      this.emitAlert({
        level: 'critical',
        type: 'max-risk-exposure',
        message: `リスクエクスポージャーが${(metrics.riskExposure * 100).toFixed(1)}%を超えました`,
        timestamp: Date.now(),
        data: { riskExposure: metrics.riskExposure }
      });
    }
  }

  private checkTradeAlerts(trade: Trade): void {
    // 連続損失のチェック
    const recentTrades = this.portfolio.trades.slice(-10);
    const consecutiveLosses = this.countConsecutiveLosses(recentTrades);

    if (consecutiveLosses >= 3) {
      this.emitAlert({
        level: 'warning',
        type: 'consecutive-losses',
        message: `連続${consecutiveLosses}回の損失が発生しました`,
        timestamp: Date.now(),
        data: { consecutiveLosses }
      });
    }

    // 大口損失のチェック
    if (trade.profit < -1000) {
      this.emitAlert({
        level: 'critical',
        type: 'large-loss',
        message: `大口損失が発生しました: ${trade.profit.toFixed(2)}ドル`,
        timestamp: Date.now(),
        data: { trade }
      });
    }
  }

  private calculateCurrentMetrics(): MonitoringMetrics {
    const today = new Date().toDateString();
    const todayTrades = this.portfolio.trades.filter(
      t => new Date(t.timestamp).toDateString() === today
    );

    const dailyPnL = todayTrades.reduce((sum, t) => sum + t.profit, 0);
    const dailyReturn = this.portfolio.initialValue > 0
      ? dailyPnL / this.portfolio.initialValue
      : 0;

    const openPositions = Object.keys(this.portfolio.positions).length;
    const unrealizedPnL = this.calculateUnrealizedPnL();
    const riskExposure = this.calculateRiskExposure();

    return {
      timestamp: Date.now(),
      portfolioValue: this.portfolio.currentValue,
      dailyPnL,
      dailyReturn,
      openPositions,
      activeOrders: this.portfolio.orders.filter(o => o.status === 'OPEN').length,
      unrealizedPnL,
      riskExposure
    };
  }

  private calculateUnrealizedPnL(): number {
    let unrealizedPnL = 0;

    for (const [symbol, position] of Object.entries(this.portfolio.positions)) {
      const currentPrice = this.getCurrentPrice(symbol);
      if (currentPrice) {
        unrealizedPnL += (currentPrice - position.entryPrice) * position.quantity;
      }
    }

    return unrealizedPnL;
  }

  private calculateRiskExposure(): number {
    let totalRisk = 0;

    for (const [symbol, position] of Object.entries(this.portfolio.positions)) {
      const currentPrice = this.getCurrentPrice(symbol);
      if (currentPrice && position.stopLoss) {
        const risk = Math.abs(currentPrice - position.stopLoss) * position.quantity;
        totalRisk += risk;
      }
    }

    return this.portfolio.currentValue > 0
      ? totalRisk / this.portfolio.currentValue
      : 0;
  }

  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    let peak = this.portfolio.initialValue;

    for (const snapshot of this.portfolio.history) {
      peak = Math.max(peak, snapshot.value);
      const drawdown = (peak - snapshot.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private countConsecutiveLosses(trades: Trade[]): number {
    let count = 0;

    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].profit < 0) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  private recordMetrics(): void {
    const metrics = this.calculateCurrentMetrics();
    this.metricsHistory.push(metrics);

    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }
  }

  private emitAlert(alert: MonitoringAlert): void {
    this.alerts.push(alert);

    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    this.emit('alert', alert);
  }

  getCurrentMetrics(): MonitoringMetrics {
    return this.calculateCurrentMetrics();
  }

  getMetricsHistory(): MonitoringMetrics[] {
    return [...this.metricsHistory];
  }

  getAlerts(level?: 'info' | 'warning' | 'critical'): MonitoringAlert[] {
    if (level) {
      return this.alerts.filter(a => a.level === level);
    }
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  private getCurrentPrice(symbol: string): number | null {
    // 実際の実装では市場データから取得
    return null;
  }
}
```

### 3. 詳細な分析機能の追加

```typescript
// src/performance/PerformanceAnalyzer.ts
import { Trade, Portfolio } from '@/types/trading';

export interface AnalysisResult {
  summary: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
  };
  timeAnalysis: {
    hourlyPerformance: Map<number, number>;
    dailyPerformance: Map<string, number>;
    monthlyPerformance: Map<string, number>;
  };
  symbolAnalysis: Map<string, {
    trades: number;
    winRate: number;
    totalProfit: number;
    averageProfit: number;
  }>;
  patternAnalysis: {
    consecutiveWins: number[];
    consecutiveLosses: number[];
    winningStreaks: number[];
    losingStreaks: number[];
  };
  recommendations: string[];
}

export class PerformanceAnalyzer {
  analyze(trades: Trade[], portfolio: Portfolio): AnalysisResult {
    return {
      summary: this.analyzeSummary(trades),
      timeAnalysis: this.analyzeTime(trades),
      symbolAnalysis: this.analyzeSymbols(trades),
      patternAnalysis: this.analyzePatterns(trades),
      recommendations: this.generateRecommendations(trades, portfolio)
    };
  }

  private analyzeSummary(trades: Trade[]): AnalysisResult['summary'] {
    const tradePairs = this.pairTrades(trades);

    return {
      totalTrades: tradePairs.length,
      winRate: this.calculateWinRate(tradePairs),
      profitFactor: this.calculateProfitFactor(tradePairs),
      expectancy: this.calculateExpectancy(tradePairs)
    };
  }

  private analyzeTime(trades: Trade[]): AnalysisResult['timeAnalysis'] {
    const hourlyPerformance = new Map<number, number>();
    const dailyPerformance = new Map<string, number>();
    const monthlyPerformance = new Map<string, number>();

    const tradePairs = this.pairTrades(trades);

    for (const trade of tradePairs) {
      const date = new Date(trade.exitTime);

      // 時間別パフォーマンス
      const hour = date.getHours();
      hourlyPerformance.set(
        hour,
        (hourlyPerformance.get(hour) || 0) + trade.profit
      );

      // 曜日別パフォーマンス
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      dailyPerformance.set(
        day,
        (dailyPerformance.get(day) || 0) + trade.profit
      );

      // 月別パフォーマンス
      const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      monthlyPerformance.set(
        month,
        (monthlyPerformance.get(month) || 0) + trade.profit
      );
    }

    return {
      hourlyPerformance,
      dailyPerformance,
      monthlyPerformance
    };
  }

  private analyzeSymbols(trades: Trade[]): AnalysisResult['symbolAnalysis'] {
    const symbolAnalysis = new Map();

    const tradePairs = this.pairTrades(trades);

    for (const trade of tradePairs) {
      const symbol = trade.symbol;

      if (!symbolAnalysis.has(symbol)) {
        symbolAnalysis.set(symbol, {
          trades: 0,
          wins: 0,
          totalProfit: 0
        });
      }

      const analysis = symbolAnalysis.get(symbol);
      analysis.trades++;
      analysis.totalProfit += trade.profit;

      if (trade.profit > 0) {
        analysis.wins++;
      }
    }

    // 集計値の計算
    for (const [symbol, analysis] of symbolAnalysis.entries()) {
      symbolAnalysis.set(symbol, {
        trades: analysis.trades,
        winRate: analysis.trades > 0 ? analysis.wins / analysis.trades : 0,
        totalProfit: analysis.totalProfit,
        averageProfit: analysis.trades > 0 ? analysis.totalProfit / analysis.trades : 0
      });
    }

    return symbolAnalysis;
  }

  private analyzePatterns(trades: Trade[]): AnalysisResult['patternAnalysis'] {
    const tradePairs = this.pairTrades(trades);

    const consecutiveWins: number[] = [];
    const consecutiveLosses: number[] = [];
    const winningStreaks: number[] = [];
    const losingStreaks: number[] = [];

    let currentWinStreak = 0;
    let currentLosingStreak = 0;

    for (const trade of tradePairs) {
      if (trade.profit > 0) {
        currentWinStreak++;
        winningStreaks.push(currentWinStreak);
        if (currentLosingStreak > 0) {
          consecutiveLosses.push(currentLosingStreak);
          currentLosingStreak = 0;
        }
      } else {
        currentLosingStreak++;
        losingStreaks.push(currentLosingStreak);
        if (currentWinStreak > 0) {
          consecutiveWins.push(currentWinStreak);
          currentWinStreak = 0;
        }
      }
    }

    return {
      consecutiveWins,
      consecutiveLosses,
      winningStreaks,
      losingStreaks
    };
  }

  private generateRecommendations(trades: Trade[], portfolio: Portfolio): string[] {
    const recommendations: string[] = [];
    const tradePairs = this.pairTrades(trades);

    // 勝率の分析
    const winRate = this.calculateWinRate(tradePairs);
    if (winRate < 0.4) {
      recommendations.push('勝率が低いです。エントリー条件を見直してください。');
    } else if (winRate > 0.6) {
      recommendations.push('勝率が良好です。現在の戦略を維持してください。');
    }

    // プロフィットファクターの分析
    const profitFactor = this.calculateProfitFactor(tradePairs);
    if (profitFactor < 1.5) {
      recommendations.push('プロフィットファクターが低いです。損切りと利益確定のバランスを調整してください。');
    }

    // 時間別パフォーマンスの分析
    const timeAnalysis = this.analyzeTime(trades);
    const bestHour = this.findBestPerformingHour(timeAnalysis.hourlyPerformance);
    const worstHour = this.findWorstPerformingHour(timeAnalysis.hourlyPerformance);

    if (bestHour !== null && worstHour !== null) {
      recommendations.push(
        `最もパフォーマンスが良い時間帯は${bestHour}時、悪い時間帯は${worstHour}時です。`
      );
    }

    // シンボル別パフォーマンスの分析
    const symbolAnalysis = this.analyzeSymbols(trades);
    const bestSymbol = this.findBestPerformingSymbol(symbolAnalysis);
    const worstSymbol = this.findWorstPerformingSymbol(symbolAnalysis);

    if (bestSymbol && worstSymbol) {
      recommendations.push(
        `最もパフォーマンスが良い銘柄は${bestSymbol}、悪い銘柄は${worstSymbol}です。`
      );
    }

    // ストリークの分析
    const patternAnalysis = this.analyzePatterns(trades);
    const avgWinningStreak = patternAnalysis.winningStreaks.length > 0
      ? patternAnalysis.winningStreaks.reduce((sum, s) => sum + s, 0) / patternAnalysis.winningStreaks.length
      : 0;

    const avgLosingStreak = patternAnalysis.losingStreaks.length > 0
      ? patternAnalysis.losingStreaks.reduce((sum, s) => sum + s, 0) / patternAnalysis.losingStreaks.length
      : 0;

    if (avgLosingStreak > avgWinningStreak) {
      recommendations.push('連敗の平均が連勝の平均を上回っています。損切りルールを見直してください。');
    }

    return recommendations;
  }

  private pairTrades(trades: Trade[]): Array<{ profit: number; symbol: string; exitTime: number }> {
    const pairs: Array<{ profit: number; symbol: string; exitTime: number }> = [];
    let entry: Trade | null = null;

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        entry = trade;
      } else if (trade.type === 'SELL' && entry) {
        const profit = (trade.price - entry.price) * entry.quantity - entry.commission - trade.commission;
        pairs.push({ profit, symbol: entry.symbol, exitTime: trade.timestamp });
        entry = null;
      }
    }

    return pairs;
  }

  private calculateWinRate(tradePairs: Array<{ profit: number }>): number {
    if (tradePairs.length === 0) return 0;

    const winningTrades = tradePairs.filter(t => t.profit > 0).length;
    return winningTrades / tradePairs.length;
  }

  private calculateProfitFactor(tradePairs: Array<{ profit: number }>): number {
    const grossProfit = tradePairs.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(tradePairs.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));

    return grossLoss > 0 ? grossProfit / grossLoss : 0;
  }

  private calculateExpectancy(tradePairs: Array<{ profit: number }>): number {
    if (tradePairs.length === 0) return 0;

    return tradePairs.reduce((sum, t) => sum + t.profit, 0) / tradePairs.length;
  }

  private findBestPerformingHour(hourlyPerformance: Map<number, number>): number | null {
    let bestHour: number | null = null;
    let bestProfit = -Infinity;

    for (const [hour, profit] of hourlyPerformance.entries()) {
      if (profit > bestProfit) {
        bestProfit = profit;
        bestHour = hour;
      }
    }

    return bestHour;
  }

  private findWorstPerformingHour(hourlyPerformance: Map<number, number>): number | null {
    let worstHour: number | null = null;
    let worstProfit = Infinity;

    for (const [hour, profit] of hourlyPerformance.entries()) {
      if (profit < worstProfit) {
        worstProfit = profit;
        worstHour = hour;
      }
    }

    return worstHour;
  }

  private findBestPerformingSymbol(symbolAnalysis: Map<string, any>): string | null {
    let bestSymbol: string | null = null;
    let bestProfit = -Infinity;

    for (const [symbol, analysis] of symbolAnalysis.entries()) {
      if (analysis.totalProfit > bestProfit) {
        bestProfit = analysis.totalProfit;
        bestSymbol = symbol;
      }
    }

    return bestSymbol;
  }

  private findWorstPerformingSymbol(symbolAnalysis: Map<string, any>): string | null {
    let worstSymbol: string | null = null;
    let worstProfit = Infinity;

    for (const [symbol, analysis] of symbolAnalysis.entries()) {
      if (analysis.totalProfit < worstProfit) {
        worstProfit = analysis.totalProfit;
        worstSymbol = symbol;
      }
    }

    return worstSymbol;
  }
}
```

### 4. レポート生成システムの開発

```typescript
// src/performance/ReportGenerator.ts
import { Trade, Portfolio } from '@/types/trading';
import { PerformanceMetrics } from './PerformanceMetrics';

export interface ReportConfig {
  title: string;
  period: {
    start: Date;
    end: Date;
  };
  includeCharts: boolean;
  includeDetails: boolean;
  format: 'html' | 'pdf' | 'json';
}

export interface Report {
  metadata: {
    title: string;
    generatedAt: Date;
    period: {
      start: Date;
      end: Date;
    };
  };
  summary: PerformanceMetrics;
  details: {
    trades: Trade[];
    equityCurve: Array<{ date: Date; value: number }>;
    drawdownCurve: Array<{ date: Date; drawdown: number }>;
  };
  analysis: any;
  recommendations: string[];
}

export class ReportGenerator {
  async generateReport(
    trades: Trade[],
    portfolio: Portfolio,
    config: ReportConfig
  ): Promise<Report> {
    // 期間でフィルタリング
    const filteredTrades = this.filterTradesByPeriod(trades, config.period);

    // メトリクスの計算
    const metrics = this.calculateMetrics(filteredTrades, portfolio);

    // 分析の実行
    const analysis = this.analyzePerformance(filteredTrades, portfolio);

    // レポートの作成
    const report: Report = {
      metadata: {
        title: config.title,
        generatedAt: new Date(),
        period: config.period
      },
      summary: metrics,
      details: {
        trades: filteredTrades,
        equityCurve: this.generateEquityCurve(portfolio),
        drawdownCurve: this.generateDrawdownCurve(portfolio)
      },
      analysis,
      recommendations: this.generateRecommendations(metrics, analysis)
    };

    return report;
  }

  async exportReport(report: Report, format: 'html' | 'pdf' | 'json'): Promise<string> {
    switch (format) {
      case 'html':
        return this.generateHTMLReport(report);
      case 'pdf':
        return await this.generatePDFReport(report);
      case 'json':
        return this.generateJSONReport(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private filterTradesByPeriod(trades: Trade[], period: { start: Date; end: Date }): Trade[] {
    const startTime = period.start.getTime();
    const endTime = period.end.getTime();

    return trades.filter(t => t.timestamp >= startTime && t.timestamp <= endTime);
  }

  private calculateMetrics(trades: Trade[], portfolio: Portfolio): PerformanceMetrics {
    // 実際の実装ではPerformanceMetricsCalculatorを使用
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      totalTrades: trades.length,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      informationRatio: 0,
      treynorRatio: 0,
      maxDrawdown: 0,
      averageDrawdown: 0,
      volatility: 0,
      downsideDeviation: 0,
      valueAtRisk: 0,
      conditionalValueAtRisk: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      averageWinLossRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      averageHoldingPeriod: 0,
      averageRMultiple: 0,
      expectancy: 0,
      kellyCriterion: 0,
      riskOfRuin: 0,
      SQN: 0
    };
  }

  private analyzePerformance(trades: Trade[], portfolio: Portfolio): any {
    // 実際の実装ではPerformanceAnalyzerを使用
    return {};
  }

  private generateRecommendations(metrics: PerformanceMetrics, analysis: any): string[] {
    const recommendations: string[] = [];

    if (metrics.sharpeRatio < 1) {
      recommendations.push('シャープレシオが低いです。リスク調整後のリターンを改善してください。');
    }

    if (metrics.maxDrawdown > 0.2) {
      recommendations.push('最大ドローダウンが大きいです。リスク管理を強化してください。');
    }

    if (metrics.winRate < 0.4) {
      recommendations.push('勝率が低いです。エントリー条件を見直してください。');
    }

    return recommendations;
  }

  private generateEquityCurve(portfolio: Portfolio): Array<{ date: Date; value: number }> {
    return portfolio.history.map(snapshot => ({
      date: new Date(snapshot.timestamp),
      value: snapshot.value
    }));
  }

  private generateDrawdownCurve(portfolio: Portfolio): Array<{ date: Date; drawdown: number }> {
    let peak = portfolio.initialValue;
    const curve: Array<{ date: Date; drawdown: number }> = [];

    for (const snapshot of portfolio.history) {
      peak = Math.max(peak, snapshot.value);
      const drawdown = peak > 0 ? (peak - snapshot.value) / peak : 0;

      curve.push({
        date: new Date(snapshot.timestamp),
        drawdown
      });
    }

    return curve;
  }

  private generateHTMLReport(report: Report): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${report.metadata.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .metric { margin: 10px 0; }
    .metric-label { font-weight: bold; }
  </style>
</head>
<body>
  <h1>${report.metadata.title}</h1>
  <p>Generated: ${report.metadata.generatedAt.toISOString()}</p>
  <p>Period: ${report.metadata.period.start.toISOString()} to ${report.metadata.period.end.toISOString()}</p>

  <h2>Summary</h2>
  <div class="metric">
    <span class="metric-label">Total Return:</span>
    ${(report.summary.totalReturn * 100).toFixed(2)}%
  </div>
  <div class="metric">
    <span class="metric-label">Sharpe Ratio:</span>
    ${report.summary.sharpeRatio.toFixed(2)}
  </div>
  <div class="metric">
    <span class="metric-label">Max Drawdown:</span>
    ${(report.summary.maxDrawdown * 100).toFixed(2)}%
  </div>
  <div class="metric">
    <span class="metric-label">Win Rate:</span>
    ${(report.summary.winRate * 100).toFixed(2)}%
  </div>

  <h2>Recommendations</h2>
  <ul>
    ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
  </ul>
</body>
</html>
    `;
  }

  private async generatePDFReport(report: Report): Promise<string> {
    // 実際の実装ではPDFライブラリを使用
    return 'PDF report content';
  }

  private generateJSONReport(report: Report): string {
    return JSON.stringify(report, null, 2);
  }
}
```

## 実装計画

### フェーズ1: 高度なパフォーマンスメトリクス（2週間）
- [ ] 基本メトリクスの実装
- [ ] リスク調整済みメトリクスの実装
- [ ] リスクメトリクスの実装
- [ ] 取引品質メトリクスの実装
- [ ] ユニットテストの作成

### フェーズ2: リアルタイム監視システム（2週間）
- [ ] メトリクス収集の実装
- [ ] アラートシステムの実装
- [ ] しきい値管理の実装
- [ ] 履歴データの管理
- [ ] 統合テストの作成

### フェーズ3: 詳細な分析機能（2週間）
- [ ] 時間別分析の実装
- [ ] シンボル別分析の実装
- [ ] パターン分析の実装
- [ ] 推奨事項の生成
- [ ] パフォーマンステストの作成

### フェーズ4: レポート生成システム（2週間）
- [ ] レポートテンプレートの作成
- [ ] HTMLレポート生成の実装
- [ ] PDFレポート生成の実装
- [ ] JSONレポート生成の実装
- [ ] E2Eテストの作成

## 成功基準
- メトリクス計算の精度99%以上
- リアルタイム監視の遅延100ms以下
- 分析機能のカバレッジ90%以上
- レポート生成時間5秒以下

## 関連Issue
- TRADING-001: データ品質と信頼性の向上
- TRADING-002: 取引戦略とシグナル生成の精度向上

## ラベル
enhancement, performance, priority:medium
