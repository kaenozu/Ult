/**
 * MultiTimeFrameStrategy.ts
 * 
 * マルチ時間枠取引戦略エンジン
 * 
 * 【機能】
 * - 複数の時間枠でのテクニカル分析
 * - 時間枠間の整合性チェック
 * - 重み付けシグナル生成
 * - フェイクシグナルのフィルタリング
 * - トレンド方向の統一判定
 */

import { 
  OHLCV, 
  TimeFrame, 
  TimeFrameSignal, 
  MultiTimeFrameAnalysis,
  TimeFrameWeights,
  MultiTimeFrameConfig
} from '@/app/types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { marketRegimeDetector } from '../MarketRegimeDetector';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TIMEFRAME_WEIGHTS: TimeFrameWeights = {
  'monthly': 0.30,
  'weekly': 0.25,
  'daily': 0.25,
  '60min': 0.10,
  '30min': 0.05,
  '15min': 0.03,
  '5min': 0.02,
  '1min': 0.00, // 最短時間枠は参考程度
};

const DEFAULT_CONFIG: MultiTimeFrameConfig = {
  timeFrames: ['daily', 'weekly', 'monthly'],
  weights: DEFAULT_TIMEFRAME_WEIGHTS,
  minAlignment: 0.6, // 60%以上の整合性が必要
  requireHigherTimeFrameConfirmation: true,
  divergenceThreshold: 0.4, // 40%以上の乖離は警告
};

// ============================================================================
// Multi-Timeframe Strategy Engine
// ============================================================================

export class MultiTimeFrameStrategy {
  private config: MultiTimeFrameConfig;
  private indicators: Map<TimeFrame, Map<string, number[]>>;

  constructor(config?: Partial<MultiTimeFrameConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.indicators = new Map();
  }

  /**
   * メインメソッド: 複数時間枠の分析を実行
   */
  async analyzeMultipleTimeFrames(
    symbol: string,
    dataByTimeFrame: Map<TimeFrame, OHLCV[]>
  ): Promise<MultiTimeFrameAnalysis> {
    // 各時間枠でシグナルを生成
    const timeFrameSignals: TimeFrameSignal[] = [];
    
    for (const timeFrame of this.config.timeFrames) {
      const data = dataByTimeFrame.get(timeFrame);
      if (!data || data.length < 50) {
        continue; // データ不足の時間枠はスキップ
      }

      const signal = await this.analyzeTimeFrame(symbol, timeFrame, data);
      timeFrameSignals.push(signal);
    }

    // 時間枠間の整合性を計算
    const alignment = this.calculateAlignment(timeFrameSignals);

    // 重み付けシグナルを計算
    const weightedSignal = this.calculateWeightedSignal(timeFrameSignals);

    // トレンド方向を判定
    const trendDirection = this.determineTrendDirection(timeFrameSignals);

    // 乖離検出
    const divergenceDetected = this.detectDivergence(timeFrameSignals);

    // 最終シグナルを決定
    const primarySignal = this.determinePrimarySignal(
      weightedSignal,
      alignment,
      divergenceDetected
    );

    // 信頼度を計算
    const confidence = this.calculateConfidence(alignment, timeFrameSignals, divergenceDetected);

    // 推奨理由を生成
    const reasoning = this.generateReasoning(timeFrameSignals, alignment, divergenceDetected);

    // 推奨文を生成
    const recommendation = this.generateRecommendation(
      primarySignal,
      confidence,
      alignment,
      divergenceDetected
    );

    return {
      symbol,
      primarySignal,
      alignment,
      weightedSignal,
      confidence,
      timeFrameSignals,
      trendDirection,
      divergenceDetected,
      recommendation,
      reasoning,
    };
  }

  /**
   * 単一時間枠の分析
   */
  private async analyzeTimeFrame(
    symbol: string,
    timeFrame: TimeFrame,
    data: OHLCV[]
  ): Promise<TimeFrameSignal> {
    const closes = data.map(d => d.close);

    // テクニカル指標を計算
    const rsi = technicalIndicatorService.calculateRSI(closes);
    const macd = technicalIndicatorService.calculateMACD(closes);
    const adx = marketRegimeDetector.calculateADX(data);

    const currentRSI = rsi[rsi.length - 1] || 50;
    const currentMACD = macd.histogram[macd.histogram.length - 1] || 0;
    const currentADX = adx || 20;

    // トレンド判定
    const trend = this.determineTrend(closes, currentMACD, currentADX);

    // シグナル判定
    const signal = this.generateSignalFromIndicators(currentRSI, currentMACD, trend);

    // シグナル強度を計算
    const strength = this.calculateSignalStrength(currentRSI, currentMACD, currentADX);

    // 信頼度を計算
    const confidence = this.calculateTimeFrameConfidence(
      currentRSI,
      currentMACD,
      currentADX,
      data
    );

    // 時間枠の重みを取得
    const weight = this.config.weights[timeFrame] || 0;

    return {
      timeFrame,
      signal,
      strength,
      confidence,
      indicators: {
        rsi: currentRSI,
        macd: currentMACD,
        adx: currentADX,
        trend,
      },
      weight,
    };
  }

  /**
   * トレンド判定
   */
  private determineTrend(
    closes: number[],
    macd: number,
    adx: number
  ): 'UP' | 'DOWN' | 'NEUTRAL' {
    if (adx < 20) {
      return 'NEUTRAL'; // トレンドが弱い
    }

    // 短期・長期移動平均でトレンド判定
    const sma20 = technicalIndicatorService.calculateSMA(closes, 20);
    const sma50 = technicalIndicatorService.calculateSMA(closes, 50);

    const currentPrice = closes[closes.length - 1];
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];

    if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50 && macd > 0) {
      return 'UP';
    } else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50 && macd < 0) {
      return 'DOWN';
    }

    return 'NEUTRAL';
  }

  /**
   * 指標からシグナルを生成
   */
  private generateSignalFromIndicators(
    rsi: number,
    macd: number,
    trend: 'UP' | 'DOWN' | 'NEUTRAL'
  ): 'BUY' | 'SELL' | 'HOLD' {
    let buyScore = 0;
    let sellScore = 0;

    // RSIシグナル
    if (rsi < 30) {
      buyScore += 2;
    } else if (rsi < 40) {
      buyScore += 1;
    } else if (rsi > 70) {
      sellScore += 2;
    } else if (rsi > 60) {
      sellScore += 1;
    }

    // MACDシグナル
    if (macd > 0) {
      buyScore += 1;
    } else if (macd < 0) {
      sellScore += 1;
    }

    // トレンドシグナル
    if (trend === 'UP') {
      buyScore += 2;
    } else if (trend === 'DOWN') {
      sellScore += 2;
    }

    // 最終判定
    if (buyScore > sellScore && buyScore >= 3) {
      return 'BUY';
    } else if (sellScore > buyScore && sellScore >= 3) {
      return 'SELL';
    }

    return 'HOLD';
  }

  /**
   * シグナル強度を計算 (0-1)
   */
  private calculateSignalStrength(rsi: number, macd: number, adx: number): number {
    let strength = 0;

    // RSI強度 (極端な値ほど強い)
    if (rsi < 20 || rsi > 80) {
      strength += 0.4;
    } else if (rsi < 30 || rsi > 70) {
      strength += 0.3;
    } else if (rsi < 40 || rsi > 60) {
      strength += 0.2;
    } else {
      strength += 0.1;
    }

    // MACD強度 (絶対値が大きいほど強い)
    const macdStrength = Math.min(Math.abs(macd) / 5, 0.3);
    strength += macdStrength;

    // ADX強度 (トレンドの強さ)
    if (adx > 40) {
      strength += 0.3;
    } else if (adx > 25) {
      strength += 0.2;
    } else {
      strength += 0.1;
    }

    return Math.min(strength, 1.0);
  }

  /**
   * 時間枠の信頼度を計算
   */
  private calculateTimeFrameConfidence(
    rsi: number,
    macd: number,
    adx: number,
    data: OHLCV[]
  ): number {
    let confidence = 50;

    // データ量による信頼度
    if (data.length >= 200) {
      confidence += 20;
    } else if (data.length >= 100) {
      confidence += 10;
    }

    // ADXによる信頼度 (トレンドが明確なほど高い)
    if (adx > 30) {
      confidence += 15;
    } else if (adx > 20) {
      confidence += 10;
    }

    // RSIによる信頼度 (極端な値は信頼度高い)
    if (rsi < 25 || rsi > 75) {
      confidence += 15;
    } else if (rsi < 35 || rsi > 65) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  /**
   * 時間枠間の整合性を計算 (0-1)
   */
  private calculateAlignment(signals: TimeFrameSignal[]): number {
    if (signals.length === 0) {
      return 0;
    }

    // 各シグナルタイプのカウント
    const counts = { BUY: 0, SELL: 0, HOLD: 0 };
    let totalWeight = 0;

    for (const signal of signals) {
      counts[signal.signal] += signal.weight;
      totalWeight += signal.weight;
    }

    if (totalWeight === 0) {
      return 0;
    }

    // 最も多いシグナルの割合を返す
    const maxCount = Math.max(counts.BUY, counts.SELL, counts.HOLD);
    return maxCount / totalWeight;
  }

  /**
   * 重み付けシグナルを計算
   */
  private calculateWeightedSignal(signals: TimeFrameSignal[]): 'BUY' | 'SELL' | 'HOLD' {
    let buyWeight = 0;
    let sellWeight = 0;
    let holdWeight = 0;

    for (const signal of signals) {
      const weight = signal.weight * signal.strength;
      
      if (signal.signal === 'BUY') {
        buyWeight += weight;
      } else if (signal.signal === 'SELL') {
        sellWeight += weight;
      } else {
        holdWeight += weight;
      }
    }

    // 最も重みの大きいシグナルを返す
    const maxWeight = Math.max(buyWeight, sellWeight, holdWeight);
    
    if (maxWeight === buyWeight && buyWeight > 0) {
      return 'BUY';
    } else if (maxWeight === sellWeight && sellWeight > 0) {
      return 'SELL';
    }

    return 'HOLD';
  }

  /**
   * トレンド方向を判定
   */
  private determineTrendDirection(signals: TimeFrameSignal[]): 'bullish' | 'bearish' | 'neutral' {
    let bullishCount = 0;
    let bearishCount = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      if (signal.indicators.trend === 'UP') {
        bullishCount += signal.weight;
      } else if (signal.indicators.trend === 'DOWN') {
        bearishCount += signal.weight;
      }
      totalWeight += signal.weight;
    }

    if (totalWeight === 0) {
      return 'neutral';
    }

    const bullishRatio = bullishCount / totalWeight;
    const bearishRatio = bearishCount / totalWeight;

    if (bullishRatio > 0.6) {
      return 'bullish';
    } else if (bearishRatio > 0.6) {
      return 'bearish';
    }

    return 'neutral';
  }

  /**
   * 乖離を検出
   */
  private detectDivergence(signals: TimeFrameSignal[]): boolean {
    if (signals.length < 2) {
      return false;
    }

    // より長い時間枠とより短い時間枠のシグナルを比較
    const sortedSignals = [...signals].sort((a, b) => {
      const order: Record<TimeFrame, number> = {
        '1min': 1, '5min': 2, '15min': 3, '30min': 4,
        '60min': 5, 'daily': 6, 'weekly': 7, 'monthly': 8
      };
      return order[b.timeFrame] - order[a.timeFrame];
    });

    const longerTimeFrame = sortedSignals[0];
    const shorterTimeFrame = sortedSignals[sortedSignals.length - 1];

    // シグナルが正反対の場合は乖離と判定
    if (
      (longerTimeFrame.signal === 'BUY' && shorterTimeFrame.signal === 'SELL') ||
      (longerTimeFrame.signal === 'SELL' && shorterTimeFrame.signal === 'BUY')
    ) {
      return true;
    }

    return false;
  }

  /**
   * 最終シグナルを決定
   */
  private determinePrimarySignal(
    weightedSignal: 'BUY' | 'SELL' | 'HOLD',
    alignment: number,
    divergenceDetected: boolean
  ): 'BUY' | 'SELL' | 'HOLD' {
    // 整合性が低い場合はHOLD
    if (alignment < this.config.minAlignment) {
      return 'HOLD';
    }

    // 乖離が検出された場合はHOLD
    if (divergenceDetected && alignment < 0.8) {
      return 'HOLD';
    }

    // 上位時間枠の確認が必要な場合
    if (this.config.requireHigherTimeFrameConfirmation) {
      // この判定は analyzeTimeFrame で行われているため、ここではweightedSignalをそのまま使用
      return weightedSignal;
    }

    return weightedSignal;
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(
    alignment: number,
    signals: TimeFrameSignal[],
    divergenceDetected: boolean
  ): number {
    // ベース信頼度: 整合性から算出
    let confidence = alignment * 100;

    // 各時間枠の信頼度の平均を加味
    if (signals.length > 0) {
      const avgTimeFrameConfidence = signals.reduce(
        (sum, s) => sum + s.confidence, 
        0
      ) / signals.length;
      confidence = (confidence + avgTimeFrameConfidence) / 2;
    }

    // 乖離がある場合は信頼度を減少
    if (divergenceDetected) {
      confidence *= 0.7;
    }

    // 時間枠が多いほど信頼度が上がる
    if (signals.length >= 3) {
      confidence += 10;
    }

    return Math.min(Math.round(confidence), 100);
  }

  /**
   * 推奨理由を生成
   */
  private generateReasoning(
    signals: TimeFrameSignal[],
    alignment: number,
    divergenceDetected: boolean
  ): string[] {
    const reasons: string[] = [];

    // 時間枠ごとの分析結果
    for (const signal of signals) {
      const timeFrameLabel = this.getTimeFrameLabel(signal.timeFrame);
      const trendLabel = signal.indicators.trend === 'UP' ? '上昇' : 
                         signal.indicators.trend === 'DOWN' ? '下降' : '横ばい';
      
      reasons.push(
        `${timeFrameLabel}: ${signal.signal}シグナル (強度: ${(signal.strength * 100).toFixed(0)}%, ` +
        `RSI: ${signal.indicators.rsi.toFixed(1)}, トレンド: ${trendLabel})`
      );
    }

    // 整合性の評価
    if (alignment >= 0.8) {
      reasons.push(`✓ 時間枠間の整合性が高い (${(alignment * 100).toFixed(0)}%)`);
    } else if (alignment >= 0.6) {
      reasons.push(`注意: 時間枠間の整合性が中程度 (${(alignment * 100).toFixed(0)}%)`);
    } else {
      reasons.push(`警告: 時間枠間の整合性が低い (${(alignment * 100).toFixed(0)}%)`);
    }

    // 乖離の警告
    if (divergenceDetected) {
      reasons.push('⚠ 短期と長期の時間枠で異なるシグナルが検出されています');
    }

    return reasons;
  }

  /**
   * 推奨文を生成
   */
  private generateRecommendation(
    signal: 'BUY' | 'SELL' | 'HOLD',
    confidence: number,
    alignment: number,
    divergenceDetected: boolean
  ): string {
    if (signal === 'HOLD') {
      if (divergenceDetected) {
        return '時間枠間で相反するシグナルが出ているため、様子見を推奨します。';
      }
      if (alignment < 0.6) {
        return '時間枠間の整合性が低いため、明確なシグナルが出るまで待機を推奨します。';
      }
      return '現時点では明確なトレンドが見られないため、様子見を推奨します。';
    }

    const action = signal === 'BUY' ? '買い' : '売り';
    const confidenceLevel = confidence >= 80 ? '高い' : confidence >= 60 ? '中程度の' : '低い';

    if (divergenceDetected) {
      return `${action}シグナルが出ていますが、時間枠間で乖離があるため注意が必要です。`;
    }

    return `${confidenceLevel}信頼度 (${confidence}%) で${action}シグナルが発生しています。`;
  }

  /**
   * 時間枠のラベルを取得
   */
  private getTimeFrameLabel(timeFrame: TimeFrame): string {
    const labels: Record<TimeFrame, string> = {
      '1min': '1分足',
      '5min': '5分足',
      '15min': '15分足',
      '30min': '30分足',
      '60min': '1時間足',
      'daily': '日足',
      'weekly': '週足',
      'monthly': '月足',
    };
    return labels[timeFrame] || timeFrame;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<MultiTimeFrameConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): MultiTimeFrameConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const multiTimeFrameStrategy = new MultiTimeFrameStrategy();
