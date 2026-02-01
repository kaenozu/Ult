# TRADING-007: 市場レジーム検出と適応的取引戦略の実装

## 概要
高度な市場レジーム検出システム、適応的取引戦略の実装、エッジケース検出機能を通じて、市場環境の変化に適応できる取引システムを構築します。

## 問題の説明
現在のシステムには以下の課題があります：

1. **市場レジーム検出の欠如**
   - トレンド・レンジ市場の区別ができない
   - ボラティリティ環境の変化を検知できない
   - 市場センチメントの変化を把握できない

2. **静的な取引戦略**
   - 市場環境に応じた戦略調整がない
   - 全ての市場で同じ戦略を使用
   - レジーム変化時のパフォーマンス低下

3. **エッジケースの未検出**
   - 極端な市場イベントに対応できない
   - フラッシュクラッシュを検知できない
   - 流動性危機を予測できない

## 影響
- 市場環境変化時のパフォーマンス低下
- 不適切な戦略使用による損失
- 極端な市場イベントへの脆弱性
- リスク管理の不備

## 推奨される解決策

### 1. 高度な市場レジーム検出システム

```typescript
// src/trading/regime/MarketRegimeDetector.ts
import { MarketData } from '@/types/trading';

export type MarketRegime =
  | 'bull-trend'
  | 'bear-trend'
  | 'range-bound'
  | 'high-volatility'
  | 'low-volatility'
  | 'crisis'
  | 'recovery';

export interface RegimeDetection {
  currentRegime: MarketRegime;
  confidence: number;
  transitionProbability: Map<MarketRegime, number>;
  regimeDuration: number;
  indicators: {
    trendStrength: number;
    volatility: number;
    momentum: number;
    volume: number;
  };
}

export interface RegimeTransition {
  from: MarketRegime;
  to: MarketRegime;
  timestamp: number;
  confidence: number;
}

export class MarketRegimeDetector {
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private regimeHistory: Array<{ regime: MarketRegime; timestamp: number }> = [];
  private transitionMatrix: Map<string, Map<string, number>> = new Map();
  private maxHistoryLength = 252; // 1年分の日次データ

  detectRegime(marketData: MarketData[]): RegimeDetection {
    // データの更新
    this.updateHistory(marketData);

    // 指標の計算
    const indicators = this.calculateIndicators();

    // レジームの判定
    const currentRegime = this.classifyRegime(indicators);
    const confidence = this.calculateConfidence(indicators, currentRegime);

    // 遷移確率の計算
    const transitionProbability = this.calculateTransitionProbability(currentRegime);

    // レジーム持続期間の計算
    const regimeDuration = this.calculateRegimeDuration(currentRegime);

    // 履歴の更新
    this.updateRegimeHistory(currentRegime);

    return {
      currentRegime,
      confidence,
      transitionProbability,
      regimeDuration,
      indicators
    };
  }

  private updateHistory(marketData: MarketData[]): void {
    for (const data of marketData) {
      if (data.ohlcv) {
        this.priceHistory.push(data.ohlcv.close);
        this.volumeHistory.push(data.ohlcv.volume);
      }
    }

    // 履歴の制限
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory = this.priceHistory.slice(-this.maxHistoryLength);
      this.volumeHistory = this.volumeHistory.slice(-this.maxHistoryLength);
    }
  }

  private calculateIndicators(): RegimeDetection['indicators'] {
    if (this.priceHistory.length < 20) {
      return {
        trendStrength: 0,
        volatility: 0,
        momentum: 0,
        volume: 0
      };
    }

    return {
      trendStrength: this.calculateTrendStrength(),
      volatility: this.calculateVolatility(),
      momentum: this.calculateMomentum(),
      volume: this.calculateVolumeTrend()
    };
  }

  private calculateTrendStrength(): number {
    // ADX（Average Directional Index）の簡易版
    const period = 14;
    if (this.priceHistory.length < period + 1) return 0;

    const recentPrices = this.priceHistory.slice(-period - 1);
    let upMoves = 0;
    let downMoves = 0;

    for (let i = 1; i < recentPrices.length; i++) {
      const change = recentPrices[i] - recentPrices[i - 1];
      if (change > 0) {
        upMoves += change;
      } else {
        downMoves += Math.abs(change);
      }
    }

    const totalMoves = upMoves + downMoves;
    if (totalMoves === 0) return 0;

    const dx = (Math.abs(upMoves - downMoves) / totalMoves) * 100;
    return dx;
  }

  private calculateVolatility(): number {
    const period = 20;
    if (this.priceHistory.length < period) return 0;

    const recentPrices = this.priceHistory.slice(-period);
    const returns = [];

    for (let i = 1; i < recentPrices.length; i++) {
      returns.push(Math.log(recentPrices[i] / recentPrices[i - 1]));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 年率化ボラティリティ
    return stdDev * Math.sqrt(252) * 100;
  }

  private calculateMomentum(): number {
    const period = 14;
    if (this.priceHistory.length < period + 1) return 0;

    const currentPrice = this.priceHistory[this.priceHistory.length - 1];
    const pastPrice = this.priceHistory[this.priceHistory.length - 1 - period];

    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  private calculateVolumeTrend(): number {
    if (this.volumeHistory.length < 20) return 0;

    const recentVolumes = this.volumeHistory.slice(-20);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const currentVolume = this.volumeHistory[this.volumeHistory.length - 1];

    return ((currentVolume - avgVolume) / avgVolume) * 100;
  }

  private classifyRegime(indicators: RegimeDetection['indicators']): MarketRegime {
    const { trendStrength, volatility, momentum, volume } = indicators;

    // 危機レジームの検出
    if (volatility > 50 && momentum < -10) {
      return 'crisis';
    }

    // 回復レジームの検出
    if (volatility > 30 && momentum > 5) {
      return 'recovery';
    }

    // 高ボラティリティレジームの検出
    if (volatility > 40) {
      return 'high-volatility';
    }

    // 低ボラティリティレジームの検出
    if (volatility < 10) {
      return 'low-volatility';
    }

    // トレンドレジームの検出
    if (trendStrength > 25) {
      return momentum > 0 ? 'bull-trend' : 'bear-trend';
    }

    // レンジレジームの検出
    return 'range-bound';
  }

  private calculateConfidence(
    indicators: RegimeDetection['indicators'],
    regime: MarketRegime
  ): number {
    let confidence = 0.5; // 基本信頼度

    // トレンド強度に基づく信頼度
    if (regime === 'bull-trend' || regime === 'bear-trend') {
      confidence += indicators.trendStrength / 100 * 0.3;
    }

    // ボラティリティに基づく信頼度
    if (regime === 'high-volatility' || regime === 'low-volatility') {
      confidence += Math.min(1, indicators.volatility / 50) * 0.3;
    }

    // モメンタムに基づく信頼度
    if (regime === 'bull-trend' && indicators.momentum > 0) {
      confidence += Math.min(1, indicators.momentum / 10) * 0.2;
    } else if (regime === 'bear-trend' && indicators.momentum < 0) {
      confidence += Math.min(1, Math.abs(indicators.momentum) / 10) * 0.2;
    }

    return Math.min(1, confidence);
  }

  private calculateTransitionProbability(currentRegime: MarketRegime): Map<MarketRegime, number> {
    const probabilities = new Map<MarketRegime, number>();

    // デフォルトの遷移確率
    const defaultProbabilities: { [key: string]: number } = {
      'bull-trend': 0.7,
      'bear-trend': 0.7,
      'range-bound': 0.6,
      'high-volatility': 0.5,
      'low-volatility': 0.5,
      'crisis': 0.3,
      'recovery': 0.4
    };

    // 履歴に基づく遷移確率の調整
    const historicalTransitions = this.transitionMatrix.get(currentRegime);
    if (historicalTransitions) {
      for (const [regime, count] of historicalTransitions.entries()) {
        probabilities.set(regime as MarketRegime, count / this.regimeHistory.length);
      }
    } else {
      for (const regime of Object.keys(defaultProbabilities)) {
        probabilities.set(regime as MarketRegime, defaultProbabilities[regime]);
      }
    }

    // 現在レジームの確率を調整
    probabilities.set(currentRegime, (probabilities.get(currentRegime) || 0) * 1.5);

    // 正規化
    const sum = Array.from(probabilities.values()).reduce((a, b) => a + b, 0);
    for (const [regime, prob] of probabilities.entries()) {
      probabilities.set(regime, prob / sum);
    }

    return probabilities;
  }

  private calculateRegimeDuration(currentRegime: MarketRegime): number {
    let duration = 0;

    for (let i = this.regimeHistory.length - 1; i >= 0; i--) {
      if (this.regimeHistory[i].regime === currentRegime) {
        duration++;
      } else {
        break;
      }
    }

    return duration;
  }

  private updateRegimeHistory(currentRegime: MarketRegime): void {
    const now = Date.now();

    // 前回のレジームを取得
    const previousRegime = this.regimeHistory.length > 0
      ? this.regimeHistory[this.regimeHistory.length - 1].regime
      : null;

    // レジーム遷移の記録
    if (previousRegime && previousRegime !== currentRegime) {
      this.recordTransition(previousRegime, currentRegime);
    }

    // レジーム履歴の更新
    this.regimeHistory.push({ regime: currentRegime, timestamp: now });

    // 履歴の制限
    if (this.regimeHistory.length > this.maxHistoryLength) {
      this.regimeHistory = this.regimeHistory.slice(-this.maxHistoryLength);
    }
  }

  private recordTransition(from: MarketRegime, to: MarketRegime): void {
    if (!this.transitionMatrix.has(from)) {
      this.transitionMatrix.set(from, new Map());
    }

    const transitions = this.transitionMatrix.get(from)!;
    transitions.set(to, (transitions.get(to) || 0) + 1);
  }

  getRegimeHistory(): Array<{ regime: MarketRegime; timestamp: number }> {
    return [...this.regimeHistory];
  }

  getTransitionMatrix(): Map<string, Map<string, number>> {
    return new Map(
      Array.from(this.transitionMatrix.entries()).map(([from, to]) => [
        from,
        new Map(to.entries())
      ])
    );
  }

  clearHistory(): void {
    this.priceHistory = [];
    this.volumeHistory = [];
    this.regimeHistory = [];
    this.transitionMatrix.clear();
  }
}
```

### 2. 適応的取引戦略の実装

```typescript
// src/trading/strategy/AdaptiveTradingStrategy.ts
import { MarketData, Signal, TradingStrategy } from '@/types/trading';
import { MarketRegime, MarketRegimeDetector } from './MarketRegimeDetector';

export interface RegimeSpecificStrategy {
  regime: MarketRegime;
  strategy: TradingStrategy;
  enabled: boolean;
  weight: number;
}

export interface AdaptiveStrategyConfig {
  regimeStrategies: RegimeSpecificStrategy[];
  transitionThreshold: number;
  minConfidence: number;
  rebalanceFrequency: number; // ミリ秒
}

export class AdaptiveTradingStrategy {
  private config: AdaptiveStrategyConfig;
  private regimeDetector: MarketRegimeDetector;
  private currentRegime: MarketRegime = 'range-bound';
  private activeStrategies: Map<MarketRegime, TradingStrategy> = new Map();
  private lastRebalance: number = 0;

  constructor(config: AdaptiveStrategyConfig) {
    this.config = config;
    this.regimeDetector = new MarketRegimeDetector();

    // 戦略の初期化
    for (const regimeStrategy of config.regimeStrategies) {
      if (regimeStrategy.enabled) {
        this.activeStrategies.set(regimeStrategy.regime, regimeStrategy.strategy);
      }
    }
  }

  async generateSignal(marketData: MarketData[]): Promise<Signal> {
    // レジームの検出
    const detection = this.regimeDetector.detectRegime(marketData);

    // 信頼度のチェック
    if (detection.confidence < this.config.minConfidence) {
      return { type: 'HOLD', confidence: detection.confidence };
    }

    // レジームの更新
    this.updateRegime(detection);

    // リバランスのチェック
    this.checkRebalance();

    // アクティブ戦略からのシグナル生成
    const signals = await this.generateSignalsFromActiveStrategies(marketData);

    // シグナルの統合
    const aggregatedSignal = this.aggregateSignals(signals, detection);

    return aggregatedSignal;
  }

  private updateRegime(detection: any): void {
    // レジーム遷移のチェック
    if (detection.currentRegime !== this.currentRegime) {
      const transitionProbability = detection.transitionProbability.get(detection.currentRegime) || 0;

      if (transitionProbability > this.config.transitionThreshold) {
        this.currentRegime = detection.currentRegime;
        this.onRegimeTransition(this.currentRegime);
      }
    }
  }

  private onRegimeTransition(newRegime: MarketRegime): void {
    // レジーム遷移時の処理
    console.log(`Regime transition detected: ${this.currentRegime} -> ${newRegime}`);

    // 必要に応じてポジションの調整
    this.adjustPositionsForRegime(newRegime);
  }

  private adjustPositionsForRegime(regime: MarketRegime): void {
    // レジームに応じたポジション調整
    switch (regime) {
      case 'crisis':
        // 危機レジームではポジションを縮小
        this.reducePositionSize(0.5);
        break;

      case 'high-volatility':
        // 高ボラティリティではポジションを縮小
        this.reducePositionSize(0.7);
        break;

      case 'bull-trend':
        // 強気トレンドではポジションを拡大
        this.increasePositionSize(1.2);
        break;

      case 'bear-trend':
        // 弱気トレンドではショートポジションを考慮
        this.enableShortSelling(true);
        break;

      case 'range-bound':
        // レンジではスキャルピング戦略を有効化
        this.enableScalping(true);
        break;

      default:
        break;
    }
  }

  private reducePositionSize(factor: number): void {
    // ポジションサイズの縮小
    console.log(`Reducing position size by factor: ${factor}`);
  }

  private increasePositionSize(factor: number): void {
    // ポジションサイズの拡大
    console.log(`Increasing position size by factor: ${factor}`);
  }

  private enableShortSelling(enabled: boolean): void {
    // ショート売りの有効化/無効化
    console.log(`Short selling ${enabled ? 'enabled' : 'disabled'}`);
  }

  private enableScalping(enabled: boolean): void {
    // スキャルピングの有効化/無効化
    console.log(`Scalping ${enabled ? 'enabled' : 'disabled'}`);
  }

  private async generateSignalsFromActiveStrategies(marketData: MarketData[]): Promise<Map<MarketRegime, Signal>> {
    const signals = new Map<MarketRegime, Signal>();

    for (const [regime, strategy] of this.activeStrategies.entries()) {
      try {
        const signal = await strategy.generateSignal(marketData);
        signals.set(regime, signal);
      } catch (error) {
        console.error(`Error generating signal for regime ${regime}:`, error);
      }
    }

    return signals;
  }

  private aggregateSignals(
    signals: Map<MarketRegime, Signal>,
    detection: any
  ): Signal {
    // 現在レジームの戦略を優先
    const currentRegimeSignal = signals.get(this.currentRegime);
    if (currentRegimeSignal) {
      return {
        ...currentRegimeSignal,
        confidence: currentRegimeSignal.confidence * detection.confidence
      };
    }

    // 重み付けされたシグナルの統合
    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;

    for (const [regime, signal] of signals.entries()) {
      const regimeStrategy = this.config.regimeStrategies.find(s => s.regime === regime);
      if (!regimeStrategy || !regimeStrategy.enabled) continue;

      const weight = regimeStrategy.weight;
      totalWeight += weight;

      if (signal.type === 'BUY') {
        buyScore += signal.confidence * weight;
      } else if (signal.type === 'SELL') {
        sellScore += signal.confidence * weight;
      }
    }

    if (totalWeight === 0) {
      return { type: 'HOLD', confidence: 0 };
    }

    const normalizedBuyScore = buyScore / totalWeight;
    const normalizedSellScore = sellScore / totalWeight;

    if (normalizedBuyScore > normalizedSellScore) {
      return {
        type: 'BUY',
        confidence: normalizedBuyScore * detection.confidence
      };
    } else if (normalizedSellScore > normalizedBuyScore) {
      return {
        type: 'SELL',
        confidence: normalizedSellScore * detection.confidence
      };
    }

    return { type: 'HOLD', confidence: 0 };
  }

  private checkRebalance(): void {
    const now = Date.now();
    if (now - this.lastRebalance > this.config.rebalanceFrequency) {
      this.rebalanceStrategies();
      this.lastRebalance = now;
    }
  }

  private rebalanceStrategies(): void {
    // 戦略のリバランス
    console.log('Rebalancing strategies...');
  }

  addRegimeStrategy(regimeStrategy: RegimeSpecificStrategy): void {
    this.config.regimeStrategies.push(regimeStrategy);

    if (regimeStrategy.enabled) {
      this.activeStrategies.set(regimeStrategy.regime, regimeStrategy.strategy);
    }
  }

  removeRegimeStrategy(regime: MarketRegime): void {
    this.config.regimeStrategies = this.config.regimeStrategies.filter(
      s => s.regime !== regime
    );
    this.activeStrategies.delete(regime);
  }

  enableRegimeStrategy(regime: MarketRegime): void {
    const regimeStrategy = this.config.regimeStrategies.find(s => s.regime === regime);
    if (regimeStrategy) {
      regimeStrategy.enabled = true;
      this.activeStrategies.set(regime, regimeStrategy.strategy);
    }
  }

  disableRegimeStrategy(regime: MarketRegime): void {
    const regimeStrategy = this.config.regimeStrategies.find(s => s.regime === regime);
    if (regimeStrategy) {
      regimeStrategy.enabled = false;
      this.activeStrategies.delete(regime);
    }
  }

  updateRegimeStrategyWeight(regime: MarketRegime, weight: number): void {
    const regimeStrategy = this.config.regimeStrategies.find(s => s.regime === regime);
    if (regimeStrategy) {
      regimeStrategy.weight = weight;
    }
  }

  getCurrentRegime(): MarketRegime {
    return this.currentRegime;
  }

  getRegimeDetector(): MarketRegimeDetector {
    return this.regimeDetector;
  }

  updateConfig(updates: Partial<AdaptiveStrategyConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
```

### 3. エッジケース検出機能

```typescript
// src/trading/edgecase/EdgeCaseDetector.ts
import { MarketData, OrderBook } from '@/types/trading';

export type EdgeCaseType =
  | 'flash-crash'
  | 'liquidity-crisis'
  | 'extreme-volatility'
  | 'volume-spike'
  | 'price-gap'
  | 'circuit-breaker'
  | 'halting';

export interface EdgeCaseAlert {
  type: EdgeCaseType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  symbol: string;
  description: string;
  metrics: {
    currentValue: number;
    threshold: number;
    deviation: number;
  };
  recommendedActions: string[];
}

export interface EdgeCaseConfig {
  flashCrashThreshold: number; // パーセンテージ
  liquidityCrisisThreshold: number; // ボリューム比率
  extremeVolatilityThreshold: number; // ボラティリティ
  volumeSpikeMultiplier: number; // ボリューム倍率
  priceGapThreshold: number; // パーセンテージ
}

export class EdgeCaseDetector {
  private config: EdgeCaseConfig;
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  private alerts: EdgeCaseAlert[] = [];
  private maxHistoryLength = 100;

  constructor(config?: Partial<EdgeCaseConfig>) {
    this.config = {
      flashCrashThreshold: 0.1, // 10%
      liquidityCrisisThreshold: 0.5, // 50%
      extremeVolatilityThreshold: 0.5, // 50%
      volumeSpikeMultiplier: 5, // 5倍
      priceGapThreshold: 0.05, // 5%
      ...config
    };
  }

  detectEdgeCases(
    symbol: string,
    marketData: MarketData,
    orderBook?: OrderBook
  ): EdgeCaseAlert[] {
    const alerts: EdgeCaseAlert[] = [];

    // 履歴の更新
    this.updateHistory(symbol, marketData);

    // 各エッジケースの検出
    alerts.push(...this.detectFlashCrash(symbol, marketData));
    alerts.push(...this.detectLiquidityCrisis(symbol, marketData, orderBook));
    alerts.push(...this.detectExtremeVolatility(symbol, marketData));
    alerts.push(...this.detectVolumeSpike(symbol, marketData));
    alerts.push(...this.detectPriceGap(symbol, marketData));

    // アラートの保存
    for (const alert of alerts) {
      this.alerts.push(alert);
    }

    // アラート履歴の制限
    if (this.alerts.length > this.maxHistoryLength) {
      this.alerts = this.alerts.slice(-this.maxHistoryLength);
    }

    return alerts;
  }

  private updateHistory(symbol: string, marketData: MarketData): void {
    if (!marketData.ohlcv) return;

    const priceHistory = this.priceHistory.get(symbol) || [];
    const volumeHistory = this.volumeHistory.get(symbol) || [];

    priceHistory.push(marketData.ohlcv.close);
    volumeHistory.push(marketData.ohlcv.volume);

    if (priceHistory.length > this.maxHistoryLength) {
      priceHistory.shift();
    }

    if (volumeHistory.length > this.maxHistoryLength) {
      volumeHistory.shift();
    }

    this.priceHistory.set(symbol, priceHistory);
    this.volumeHistory.set(symbol, volumeHistory);
  }

  private detectFlashCrash(symbol: string, marketData: MarketData): EdgeCaseAlert[] {
    const alerts: EdgeCaseAlert[] = [];
    const priceHistory = this.priceHistory.get(symbol);

    if (!priceHistory || priceHistory.length < 2) return alerts;

    const currentPrice = marketData.ohlcv?.close || 0;
    const previousPrice = priceHistory[priceHistory.length - 2];

    const priceChange = (currentPrice - previousPrice) / previousPrice;

    if (priceChange < -this.config.flashCrashThreshold) {
      alerts.push({
        type: 'flash-crash',
        severity: 'critical',
        timestamp: Date.now(),
        symbol,
        description: `フラッシュクラッシュが検出されました: ${(priceChange * 100).toFixed(2)}%の急落`,
        metrics: {
          currentValue: priceChange * 100,
          threshold: this.config.flashCrashThreshold * 100,
          deviation: Math.abs(priceChange - (-this.config.flashCrashThreshold))
        },
        recommendedActions: [
          '即座にポジションを決済してください',
          '新規ポジションのエントリーを停止してください',
          '市場状況を注意深く監視してください'
        ]
      });
    }

    return alerts;
  }

  private detectLiquidityCrisis(
    symbol: string,
    marketData: MarketData,
    orderBook?: OrderBook
  ): EdgeCaseAlert[] {
    const alerts: EdgeCaseAlert[] = [];

    if (!orderBook) return alerts;

    const bidVolume = orderBook.bids.reduce((sum, [_, volume]) => sum + volume, 0);
    const askVolume = orderBook.asks.reduce((sum, [_, volume]) => sum + volume, 0);
    const totalVolume = bidVolume + askVolume;

    const currentVolume = marketData.ohlcv?.volume || 0;
    const volumeRatio = totalVolume / currentVolume;

    if (volumeRatio < this.config.liquidityCrisisThreshold) {
      alerts.push({
        type: 'liquidity-crisis',
        severity: 'high',
        timestamp: Date.now(),
        symbol,
        description: `流動性危機が検出されました: オーダーブックのボリュームが通常の${(volumeRatio * 100).toFixed(1)}%`,
        metrics: {
          currentValue: volumeRatio * 100,
          threshold: this.config.liquidityCrisisThreshold * 100,
          deviation: this.config.liquidityCrisisThreshold - volumeRatio
        },
        recommendedActions: [
          'ポジションサイズを縮小してください',
          '指値注文の使用を検討してください',
          'スリッページに注意してください'
        ]
      });
    }

    return alerts;
  }

  private detectExtremeVolatility(symbol: string, marketData: MarketData): EdgeCaseAlert[] {
    const alerts: EdgeCaseAlert[] = [];
    const priceHistory = this.priceHistory.get(symbol);

    if (!priceHistory || priceHistory.length < 20) return alerts;

    // ボラティリティの計算
    const recentPrices = priceHistory.slice(-20);
    const returns = [];

    for (let i = 1; i < recentPrices.length; i++) {
      returns.push(Math.log(recentPrices[i] / recentPrices[i - 1]));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 年率化ボラティリティ
    const annualizedVolatility = stdDev * Math.sqrt(252);

    if (annualizedVolatility > this.config.extremeVolatilityThreshold) {
      alerts.push({
        type: 'extreme-volatility',
        severity: 'high',
        timestamp: Date.now(),
        symbol,
        description: `極端なボラティリティが検出されました: ${(annualizedVolatility * 100).toFixed(1)}%`,
        metrics: {
          currentValue: annualizedVolatility * 100,
          threshold: this.config.extremeVolatilityThreshold * 100,
          deviation: annualizedVolatility - this.config.extremeVolatilityThreshold
        },
        recommendedActions: [
          'ポジションサイズを縮小してください',
          'ストップロスを引き上げてください',
          '市場の安定を待ってください'
        ]
      });
    }

    return alerts;
  }

  private detectVolumeSpike(symbol: string, marketData: MarketData): EdgeCaseAlert[] {
    const alerts: EdgeCaseAlert[] = [];
    const volumeHistory = this.volumeHistory.get(symbol);

    if (!volumeHistory || volumeHistory.length < 20) return alerts;

    const currentVolume = marketData.ohlcv?.volume || 0;
    const avgVolume = volumeHistory.slice(-20).reduce((sum, v) => sum + v, 0) / 20;

    const volumeRatio = currentVolume / avgVolume;

    if (volumeRatio > this.config.volumeSpikeMultiplier) {
      alerts.push({
        type: 'volume-spike',
        severity: 'medium',
        timestamp: Date.now(),
        symbol,
        description: `ボリュームスパイクが検出されました: ボリュームが通常の${volumeRatio.toFixed(1)}倍`,
        metrics: {
          currentValue: volumeRatio,
          threshold: this.config.volumeSpikeMultiplier,
          deviation: volumeRatio - this.config.volumeSpikeMultiplier
        },
        recommendedActions: [
          '価格の動きを注意深く監視してください',
          '重要なニュースやイベントを確認してください',
          '急激な価格変動に備えてください'
        ]
      });
    }

    return alerts;
  }

  private detectPriceGap(symbol: string, marketData: MarketData): EdgeCaseAlert[] {
    const alerts: EdgeCaseAlert[] = [];
    const priceHistory = this.priceHistory.get(symbol);

    if (!priceHistory || priceHistory.length < 2) return alerts;

    const currentPrice = marketData.ohlcv?.close || 0;
    const previousClose = priceHistory[priceHistory.length - 2];

    const gap = (currentPrice - previousClose) / previousClose;

    if (Math.abs(gap) > this.config.priceGapThreshold) {
      alerts.push({
        type: 'price-gap',
        severity: 'medium',
        timestamp: Date.now(),
        symbol,
        description: `価格ギャップが検出されました: ${(gap * 100).toFixed(2)}%`,
        metrics: {
          currentValue: gap * 100,
          threshold: this.config.priceGapThreshold * 100,
          deviation: Math.abs(gap) - this.config.priceGapThreshold
        },
        recommendedActions: [
          'ギャップの理由を確認してください',
          '市場の開放を待ってください',
          '急いでエントリーしないでください'
        ]
      });
    }

    return alerts;
  }

  getAlerts(symbol?: string, type?: EdgeCaseType): EdgeCaseAlert[] {
    let filtered = [...this.alerts];

    if (symbol) {
      filtered = filtered.filter(a => a.symbol === symbol);
    }

    if (type) {
      filtered = filtered.filter(a => a.type === type);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getRecentAlerts(minutes: number = 60): EdgeCaseAlert[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.alerts.filter(a => a.timestamp > cutoff);
  }

  clearAlerts(symbol?: string): void {
    if (symbol) {
      this.alerts = this.alerts.filter(a => a.symbol !== symbol);
    } else {
      this.alerts = [];
    }
  }

  updateConfig(updates: Partial<EdgeCaseConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): EdgeCaseConfig {
    return { ...this.config };
  }
}
```

## 実装計画

### フェーズ1: 市場レジーム検出システム（2週間）
- [ ] レジーム分類アルゴリズムの実装
- [ ] 指標計算の実装
- [ ] 遷移確率の計算
- [ ] 履歴管理の実装
- [ ] ユニットテストの作成

### フェーズ2: 適応的取引戦略（2週間）
- [ ] レジーム別戦略の管理
- [ ] シグナル統合アルゴリズム
- [ ] ポジション調整ロジック
- [ ] リバランス機能の実装
- [ ] 統合テストの作成

### フェーズ3: エッジケース検出機能（2週間）
- [ ] 各エッジケースの検出アルゴリズム
- [ ] アラート生成システム
- [ ] 推奨アクションの生成
- [ ] 履歴管理の実装
- [ ] パフォーマンステストの作成

### フェーズ4: 統合と最適化（2週間）
- [ ] コンポーネント間の統合
- [ ] パフォーマンス最適化
- [ ] バックテストによる検証
- [ ] ドキュメントの作成
- [ ] E2Eテストの作成

## 成功基準
- レジーム検出の精度85%以上
- 適応戦略のパフォーマンス向上20%以上
- エッジケース検出の感度90%以上
- システムの応答時間100ms以下

## 関連Issue
- TRADING-001: データ品質と信頼性の向上
- TRADING-002: 取引戦略とシグナル生成の精度向上
- TRADING-003: リスク管理システムの高度化

## ラベル
enhancement, trading-strategy, priority:high
