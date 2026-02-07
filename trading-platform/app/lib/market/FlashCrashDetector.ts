/**
 * FlashCrashDetector.ts
 * 
 * フラッシュクラッシュ（急速な価格下落）を検出するためのモジュール。
 * 1分足レベルの監視を提供し、急激な価格下落を検出してアラートを発信します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * フラッシュクラッシュ検出設定
 */
export interface FlashCrashConfig {
  /** 価格下落率の閾値（デフォルト: 5%） */
  priceDropPercent: number;
  /** 監視時間枠（分）（デフォルト: 5） */
  timeWindowMinutes: number;
  /** 成交量閾値（平均の何倍か）（デフォルト: 2倍） */
  volumeThreshold: number;
  /**  심각アラートを発報する下落率閾値（デフォルト: 10%） */
  severeDropPercent: number;
  /** チェック間隔（ミリ秒）（デフォルト: 60000） */
  checkIntervalMs: number;
  /** 許容される最小データ点数 */
  minDataPoints: number;
}

/**
 * フラッシュクラッシュアラート
 */
export interface FlashCrashAlert {
  /** アラートID */
  id: string;
  /** シンボル */
  symbol: string;
  /** フラッシュクラッシュタイプ */
  type: 'FLASH_CRASH' | 'POTENTIAL_CRASH' | 'SEVERE_DROP';
  /** 重要度 */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** 検出された下落率（%） */
  dropPercent: number;
  /** 検出された時間 */
  detectedAt: Date;
  /** 監視期間中の最大下落 */
  maxDropPercent: number;
  /** 監視期間中の最小価格 */
  minPrice: number;
  /** 監視期間中の最大価格 */
  maxPrice: number;
  /** 推奨アクション */
  recommendedAction: 'HALT_TRADING' | 'REDUCE_EXPOSURE' | 'MONITOR' | 'CONTINUE';
  /** 詳細メッセージ */
  message: string;
  /** メタデータ */
  metadata: {
    timeWindowMinutes: number;
    volumeSpikeRatio: number;
    avgVolume: number;
    currentVolume: number;
  };
}

/**
 * 監視セッションの状態
 */
interface MonitoringSession {
  symbol: string;
  startTime: Date;
  data: OHLCV[];
  highestPrice: number;
  lowestPrice: number;
  totalVolume: number;
  alertTriggered: boolean;
}

/**
 * フラッシュクラッシュ検出結果
 */
export interface FlashCrashDetectionResult {
  isFlashCrash: boolean;
  alert: FlashCrashAlert | null;
  metrics: {
    maxDropPercent: number;
    avgDropRate: number;
    volumeSpikeRatio: number;
    volatility: number;
  };
  trend: 'CONTINUOUS_DROP' | 'VOLATILE' | 'STABLE';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: FlashCrashConfig = {
  priceDropPercent: 5,
  timeWindowMinutes: 5,
  volumeThreshold: 2,
  severeDropPercent: 10,
  checkIntervalMs: 60000,
  minDataPoints: 3,
};

// ============================================================================
// FlashCrashDetector Class
// ============================================================================

export class FlashCrashDetector extends EventEmitter {
  private config: FlashCrashConfig;
  private sessions: Map<string, MonitoringSession> = new Map();
  private historicalDropRates: Map<string, number[]> = new Map();

  constructor(config: Partial<FlashCrashConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * フラッシュクラッシュを検出
   */
  detect(symbol: string, data: OHLCV[]): FlashCrashDetectionResult {
    if (data.length < this.config.minDataPoints) {
      return {
        isFlashCrash: false,
        alert: null,
        metrics: {
          maxDropPercent: 0,
          avgDropRate: 0,
          volumeSpikeRatio: 1,
          volatility: 0,
        },
        trend: 'STABLE',
      };
    }

    // 監視セッションを更新
    this.updateSession(symbol, data);

    const session = this.sessions.get(symbol);
    if (!session) {
      return this.createStableResult();
    }

    // 最大下落率を計算
    const maxDrop = this.calculateMaxDrop(session);
    const avgDropRate = this.calculateAvgDropRate(session);
    const volumeSpikeRatio = this.calculateVolumeSpike(session);
    const volatility = this.calculateVolatility(data);

    // トレンドを判定
    const trend = this.determineTrend(data);

    // フラッシュクラッシュ検出
    const alert = this.checkFlashCrashConditions(
      symbol,
      session,
      maxDrop,
      volumeSpikeRatio
    );

    return {
      isFlashCrash: alert !== null,
      alert,
      metrics: {
        maxDropPercent: maxDrop,
        avgDropRate,
        volumeSpikeRatio,
        volatility,
      },
      trend,
    };
  }

  /**
   * リアルタイム監視を開始
   */
  startMonitoring(symbol: string, initialData: OHLCV[]): void {
    const session: MonitoringSession = {
      symbol,
      startTime: new Date(),
      data: [...initialData],
      highestPrice: Math.max(...initialData.map(d => d.high)),
      lowestPrice: Math.min(...initialData.map(d => d.low)),
      totalVolume: initialData.reduce((sum, d) => sum + d.volume, 0),
      alertTriggered: false,
    };
    this.sessions.set(symbol, session);

    // 既存データの履歴を記録
    this.recordHistoricalData(symbol, initialData);
  }

  /**
   * 監視を停止
   */
  stopMonitoring(symbol: string): MonitoringSession | null {
    const session = this.sessions.get(symbol);
    this.sessions.delete(symbol);
    return session || null;
  }

  /**
   * 新しいデータを追加
   */
  addDataPoint(symbol: string, dataPoint: OHLCV): void {
    const session = this.sessions.get(symbol);
    if (!session) {
      // セッションがない場合は新規作成
      this.startMonitoring(symbol, [dataPoint]);
      return;
    }

    session.data.push(dataPoint);
    session.highestPrice = Math.max(session.highestPrice, dataPoint.high);
    session.lowestPrice = Math.min(session.lowestPrice, dataPoint.low);
    session.totalVolume += dataPoint.volume;

    // データ点数が過剰の場合は古いデータを削除
    const maxDataPoints = this.config.timeWindowMinutes * 60 / (this.config.checkIntervalMs / 60000);
    if (session.data.length > maxDataPoints) {
      const removed = session.data.shift();
      if (removed) {
        session.totalVolume -= removed.volume;
      }
    }

    // 履歴を記録
    this.recordHistoricalDataPoint(symbol, dataPoint);
  }

  /**
   * セッションの状態を取得
   */
  getSession(symbol: string): MonitoringSession | null {
    return this.sessions.get(symbol) || null;
  }

  /**
   * 設定を更新
   */
  updateConfig(updates: Partial<FlashCrashConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * セッションを更新
   */
  private updateSession(symbol: string, data: OHLCV[]): void {
    const session = this.sessions.get(symbol);
    if (!session) {
      this.startMonitoring(symbol, data);
      return;
    }

    // 新しいデータを追加
    const lastSessionTime = session.data.length > 0 
      ? new Date(session.data[session.data.length - 1].date).getTime() 
      : 0;

    for (const d of data) {
      const dataTime = new Date(d.date).getTime();
      if (dataTime > lastSessionTime) {
        this.addDataPoint(symbol, d);
      }
    }
  }

  /**
   * 最大下落率を計算
   */
  private calculateMaxDrop(session: MonitoringSession): number {
    if (session.highestPrice === 0) return 0;
    return ((session.highestPrice - session.lowestPrice) / session.highestPrice) * 100;
  }

  /**
   * 平均下落率を計算
   */
  private calculateAvgDropRate(session: MonitoringSession): number {
    if (session.data.length < 2) return 0;

    let totalDrop = 0;
    for (let i = 1; i < session.data.length; i++) {
      const prevClose = session.data[i - 1].close;
      const currentClose = session.data[i].close;
      if (prevClose > 0) {
        totalDrop += ((prevClose - currentClose) / prevClose) * 100;
      }
    }

    return totalDrop / (session.data.length - 1);
  }

  /**
   * 成交量急増率を計算
   */
  private calculateVolumeSpike(session: MonitoringSession): number {
    const avgVolume = session.totalVolume / session.data.length;
    const lastVolume = session.data[session.data.length - 1]?.volume || 0;
    return avgVolume > 0 ? lastVolume / avgVolume : 1;
  }

  /**
   * ボラティリティを計算
   */
  private calculateVolatility(data: OHLCV[]): number {
    if (data.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].close - data[i - 1].close) / data[i - 1].close;
      if (!isNaN(ret) && isFinite(ret)) {
        returns.push(ret);
      }
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length;

    return Math.sqrt(variance) * 100;
  }

  /**
   * トレンドを判定
   */
  private determineTrend(data: OHLCV[]): 'CONTINUOUS_DROP' | 'VOLATILE' | 'STABLE' {
    if (data.length < 3) return 'STABLE';

    const drops: boolean[] = [];
    for (let i = 1; i < data.length; i++) {
      drops.push(data[i].close < data[i - 1].close);
    }

    const dropCount = drops.filter(d => d).length;
    const dropRatio = dropCount / drops.length;

    if (dropRatio > 0.7) return 'CONTINUOUS_DROP';
    if (dropRatio > 0.4 && dropRatio < 0.6) return 'VOLATILE';
    return 'STABLE';
  }

  /**
   * フラッシュクラッシュ条件をチェック
   */
  private checkFlashCrashConditions(
    symbol: string,
    session: MonitoringSession,
    maxDrop: number,
    volumeSpikeRatio: number
  ): FlashCrashAlert | null {
    const lastData = session.data[session.data.length - 1];
    const avgVolume = session.totalVolume / session.data.length;

    // 深刻なフラッシュクラッシュ（10%以上下落）
    if (maxDrop >= this.config.severeDropPercent) {
      return this.createAlert(
        symbol,
        session,
        'SEVERE_DROP',
        'CRITICAL',
        maxDrop,
        volumeSpikeRatio,
        avgVolume,
        'HALT_TRADING',
        `Severe price drop detected: ${maxDrop.toFixed(2)}% in ${this.config.timeWindowMinutes} minutes. Immediate action required.`
      );
    }

    // フラッシュクラッシュ（5%以上下落 + 成交量急増）
    if (maxDrop >= this.config.priceDropPercent && volumeSpikeRatio >= this.config.volumeThreshold) {
      return this.createAlert(
        symbol,
        session,
        'FLASH_CRASH',
        'HIGH',
        maxDrop,
        volumeSpikeRatio,
        avgVolume,
        'HALT_TRADING',
        `Flash crash detected: ${maxDrop.toFixed(2)}% drop with ${volumeSpikeRatio.toFixed(1)}x volume spike.`
      );
    }

    // 潜在的なクラッシュ（3%以上下落 + 成交量増加）
    if (maxDrop >= 3 && volumeSpikeRatio >= 1.5) {
      return this.createAlert(
        symbol,
        session,
        'POTENTIAL_CRASH',
        'MEDIUM',
        maxDrop,
        volumeSpikeRatio,
        avgVolume,
        'REDUCE_EXPOSURE',
        `Potential crash risk: ${maxDrop.toFixed(2)}% drop detected. Consider reducing exposure.`
      );
    }

    return null;
  }

  /**
   * アラートを作成
   */
  private createAlert(
    symbol: string,
    session: MonitoringSession,
    type: FlashCrashAlert['type'],
    severity: FlashCrashAlert['severity'],
    dropPercent: number,
    volumeSpikeRatio: number,
    avgVolume: number,
    recommendedAction: FlashCrashAlert['recommendedAction'],
    message: string
  ): FlashCrashAlert {
    const alert: FlashCrashAlert = {
      id: `flash_crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      type,
      severity,
      dropPercent,
      detectedAt: new Date(),
      maxDropPercent: dropPercent,
      minPrice: session.lowestPrice,
      maxPrice: session.highestPrice,
      recommendedAction,
      message,
      metadata: {
        timeWindowMinutes: this.config.timeWindowMinutes,
        volumeSpikeRatio,
        avgVolume,
        currentVolume: session.data[session.data.length - 1]?.volume || 0,
      },
    };

    session.alertTriggered = true;
    this.emit('flash_crash_detected', alert);

    return alert;
  }

  /**
   * 安定した結果を返す
   */
  private createStableResult(): FlashCrashDetectionResult {
    return {
      isFlashCrash: false,
      alert: null,
      metrics: {
        maxDropPercent: 0,
        avgDropRate: 0,
        volumeSpikeRatio: 1,
        volatility: 0,
      },
      trend: 'STABLE',
    };
  }

  /**
   * 履歴データを記録
   */
  private recordHistoricalData(symbol: string, data: OHLCV[]): void {
    const rates: number[] = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].close > 0) {
        const rate = ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;
        if (!isNaN(rate)) {
          rates.push(rate);
        }
      }
    }
    this.historicalDropRates.set(symbol, rates);
  }

  /**
   * 単一のデータ点を記録
   */
  private recordHistoricalDataPoint(symbol: string, dataPoint: OHLCV): void {
    const rates = this.historicalDropRates.get(symbol) || [];
    const lastClose = rates.length > 0 
      ? dataPoint.close 
      : dataPoint.close;

    if (lastClose > 0) {
      const rate = ((dataPoint.close - lastClose) / lastClose) * 100;
      if (!isNaN(rate)) {
        rates.push(rate);
        // 最新の100件のみ保持
        if (rates.length > 100) {
          rates.shift();
        }
        this.historicalDropRates.set(symbol, rates);
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const flashCrashDetector = new FlashCrashDetector();
