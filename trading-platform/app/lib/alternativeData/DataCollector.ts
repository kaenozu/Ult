/**
 * AlternativeDataCollector.ts
 * 
 * 代替データ収集エンジン - 複数のデータソースから代替データを統合的に収集・管理します。
 * Alternative Data Collection Engine - Integrates and manages alternative data from multiple sources.
 */

// Simple EventEmitter implementation for browser/Node compatibility
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * データソースの種類
 */
export type DataSourceType = 
  | 'news'           // ニュース記事
  | 'social'         // ソーシャルメディア
  | 'economic'       // 経済指標
  | 'analyst'        // アナリストレーティング
  | 'insider'        // インサイダー取引
  | 'institutional'  // 機関投資家の動き
  | 'retail';        // 個人投資家の動き

/**
 * データソースの優先度
 */
export type DataSourcePriority = 'high' | 'medium' | 'low';

/**
 * データソースの設定
 */
export interface DataSourceConfig {
  type: DataSourceType;
  name: string;
  enabled: boolean;
  priority: DataSourcePriority;
  weight: number; // 0-1の重み付け
  refreshInterval: number; // ミリ秒
  endpoint?: string;
  apiKey?: string;
  rateLimit?: {
    requests: number;
    perMilliseconds: number;
  };
}

/**
 * データ品質メトリクス
 */
export interface DataQualityMetrics {
  completeness: number; // 0-1: データの完全性
  accuracy: number;     // 0-1: データの正確性
  timeliness: number;   // 0-1: データの適時性
  consistency: number;  // 0-1: データの一貫性
  overall: number;      // 0-1: 総合評価
}

/**
 * 収集されたデータ
 */
export interface CollectedData {
  id: string;
  source: DataSourceConfig;
  type: DataSourceType;
  symbol?: string;
  timestamp: number;
  data: unknown;
  quality: DataQualityMetrics;
  processed: boolean;
}

/**
 * データ収集統計
 */
export interface CollectionStats {
  totalCollected: number;
  bySource: Record<DataSourceType, number>;
  successRate: number;
  averageQuality: number;
  lastUpdate: number;
  errors: number;
}

/**
 * コレクター設定
 */
export interface CollectorConfig {
  sources: DataSourceConfig[];
  cacheEnabled: boolean;
  cacheTTL: number; // ミリ秒
  qualityThreshold: number; // 最低品質基準 (0-1)
  retryAttempts: number;
  retryDelay: number; // ミリ秒
  maxConcurrent: number; // 同時収集数
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_COLLECTOR_CONFIG: CollectorConfig = {
  sources: [
    {
      type: 'news',
      name: 'Financial News API',
      enabled: true,
      priority: 'high',
      weight: 0.4,
      refreshInterval: 5 * 60 * 1000, // 5分
      rateLimit: { requests: 100, perMilliseconds: 60000 }
    },
    {
      type: 'social',
      name: 'Social Media API',
      enabled: true,
      priority: 'medium',
      weight: 0.3,
      refreshInterval: 3 * 60 * 1000, // 3分
      rateLimit: { requests: 150, perMilliseconds: 60000 }
    },
    {
      type: 'economic',
      name: 'Economic Indicators API',
      enabled: true,
      priority: 'high',
      weight: 0.2,
      refreshInterval: 60 * 60 * 1000, // 1時間
      rateLimit: { requests: 50, perMilliseconds: 60000 }
    },
    {
      type: 'analyst',
      name: 'Analyst Ratings API',
      enabled: true,
      priority: 'medium',
      weight: 0.1,
      refreshInterval: 30 * 60 * 1000, // 30分
      rateLimit: { requests: 50, perMilliseconds: 60000 }
    }
  ],
  cacheEnabled: true,
  cacheTTL: 15 * 60 * 1000, // 15分
  qualityThreshold: 0.6,
  retryAttempts: 3,
  retryDelay: 2000,
  maxConcurrent: 5
};

// ============================================================================
// AlternativeDataCollector Class
// ============================================================================

/**
 * 代替データ収集エンジン
 */
export class AlternativeDataCollector extends EventEmitter {
  private config: CollectorConfig;
  private dataCache: Map<string, CollectedData> = new Map();
  private collectionStats: CollectionStats;
  private activeCollections: Set<string> = new Set();
  private rateLimiters: Map<DataSourceType, { count: number; resetTime: number }> = new Map();
  private intervalHandles: Map<DataSourceType, ReturnType<typeof setInterval>> = new Map();

  constructor(config: Partial<CollectorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_COLLECTOR_CONFIG, ...config };
    
    this.collectionStats = {
      totalCollected: 0,
      bySource: {
        news: 0,
        social: 0,
        economic: 0,
        analyst: 0,
        insider: 0,
        institutional: 0,
        retail: 0
      },
      successRate: 1.0,
      averageQuality: 0.8,
      lastUpdate: Date.now(),
      errors: 0
    };
  }

  /**
   * データ収集を開始
   */
  start(): void {
    
    // 各データソースの定期収集を設定
    this.config.sources.forEach((source) => {
      if (source.enabled) {
        this.scheduleCollection(source);
      }
    });

    this.emit('started');
  }

  /**
   * データ収集を停止
   */
  stop(): void {
    
    // すべての定期収集を停止
    this.intervalHandles.forEach((handle) => {
      clearInterval(handle);
    });
    this.intervalHandles.clear();
    this.activeCollections.clear();

    this.emit('stopped');
  }

  /**
   * 定期収集をスケジュール
   */
  private scheduleCollection(source: DataSourceConfig): void {
    // 初回収集を即実行
    this.collectFromSource(source);

    // 定期収集を設定
    const handle = setInterval(() => {
      this.collectFromSource(source);
    }, source.refreshInterval);

    this.intervalHandles.set(source.type, handle);
  }

  /**
   * 特定のソースからデータを収集
   */
  private async collectFromSource(source: DataSourceConfig): Promise<void> {
    const collectionId = `${source.type}-${Date.now()}`;

    // 既に収集中の場合はスキップ
    if (this.activeCollections.has(source.type)) {
      return;
    }

    // レート制限チェック
    if (!this.checkRateLimit(source)) {
      return;
    }

    this.activeCollections.add(source.type);

    try {
      
      // データを取得（モック実装）
      const data = await this.fetchData(source);
      
      // データ品質を評価
      const quality = this.assessDataQuality(data, source);
      
      // 品質基準を満たさない場合は破棄
      if (quality.overall < this.config.qualityThreshold) {
        logger.warn(`[AlternativeDataCollector] Data quality below threshold for ${source.name}: ${quality.overall}`);
        this.collectionStats.errors++;
        this.emit('quality_warning', { source, quality });
        return;
      }

      // データを保存
      const collectedData: CollectedData = {
        id: collectionId,
        source,
        type: source.type,
        timestamp: Date.now(),
        data,
        quality,
        processed: false
      };

      this.storeData(collectedData);

      // 統計を更新
      this.updateStats(source, true, quality);

      this.emit('data_collected', collectedData);
      
    } catch (error) {
      logger.error(`[AlternativeDataCollector] Error collecting from ${source.name}:`, error instanceof Error ? error : new Error(String(error)));
      this.collectionStats.errors++;
      this.updateStats(source, false);
      this.emit('collection_error', { source, error });
      
      // リトライ
      if (this.config.retryAttempts > 0) {
        setTimeout(() => {
          this.retryCollection(source, 1);
        }, this.config.retryDelay);
      }
    } finally {
      this.activeCollections.delete(source.type);
    }
  }

  /**
   * レート制限をチェック
   */
  private checkRateLimit(source: DataSourceConfig): boolean {
    if (!source.rateLimit) return true;

    const now = Date.now();
    const limiter = this.rateLimiters.get(source.type);

    if (!limiter || now >= limiter.resetTime) {
      // 新しいウィンドウ
      this.rateLimiters.set(source.type, {
        count: 1,
        resetTime: now + source.rateLimit.perMilliseconds
      });
      return true;
    }

    if (limiter.count < source.rateLimit.requests) {
      limiter.count++;
      return true;
    }

    return false;
  }

  /**
   * データを取得（実際の実装では外部APIを呼び出す）
   */
  private async fetchData(source: DataSourceConfig): Promise<unknown> {
    // シミュレーション用の遅延
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    // モックデータを返す
    switch (source.type) {
      case 'news':
        return this.generateMockNewsData();
      case 'social':
        return this.generateMockSocialData();
      case 'economic':
        return this.generateMockEconomicData();
      case 'analyst':
        return this.generateMockAnalystData();
      default:
        return {};
    }
  }

  /**
   * データ品質を評価
   */
  private assessDataQuality(data: unknown, source: DataSourceConfig): DataQualityMetrics {
    // 実際にはデータの内容を詳細に検証する
    const completeness = data ? 0.9 : 0.0;
    const accuracy = 0.85 + Math.random() * 0.1; // ソースの信頼性に基づく
    const timeliness = 1.0; // 収集直後なので最新
    const consistency = 0.9; // 過去のデータとの一貫性

    // 優先度に基づく重み付け
    const priorityWeight = source.priority === 'high' ? 1.0 : source.priority === 'medium' ? 0.8 : 0.6;

    const overall = (completeness * 0.3 + accuracy * 0.3 + timeliness * 0.2 + consistency * 0.2) * priorityWeight;

    return {
      completeness,
      accuracy,
      timeliness,
      consistency,
      overall
    };
  }

  /**
   * データを保存
   */
  private storeData(data: CollectedData): void {
    const key = `${data.type}-${data.timestamp}`;
    
    if (this.config.cacheEnabled) {
      this.dataCache.set(key, data);
      
      // 古いデータをクリーンアップ
      const cutoff = Date.now() - this.config.cacheTTL;
      Array.from(this.dataCache.entries()).forEach(([k, v]) => {
        if (v.timestamp < cutoff) {
          this.dataCache.delete(k);
        }
      });
    }
  }

  /**
   * 統計を更新
   */
  private updateStats(source: DataSourceConfig, success: boolean, quality?: DataQualityMetrics): void {
    if (success) {
      this.collectionStats.totalCollected++;
      this.collectionStats.bySource[source.type]++;
      
      if (quality) {
        // 移動平均で品質を更新
        const alpha = 0.1; // スムージング係数
        this.collectionStats.averageQuality = 
          alpha * quality.overall + (1 - alpha) * this.collectionStats.averageQuality;
      }
    }

    // 成功率を更新
    const total = this.collectionStats.totalCollected + this.collectionStats.errors;
    this.collectionStats.successRate = total > 0 ? this.collectionStats.totalCollected / total : 1.0;
    this.collectionStats.lastUpdate = Date.now();
  }

  /**
   * 収集をリトライ
   */
  private async retryCollection(source: DataSourceConfig, attempt: number): Promise<void> {
    if (attempt > this.config.retryAttempts) {
      logger.error(`[AlternativeDataCollector] Max retry attempts reached for ${source.name}`);
      return;
    }

    
    try {
      await this.collectFromSource(source);
    } catch (error) {
      setTimeout(() => {
        this.retryCollection(source, attempt + 1);
      }, this.config.retryDelay * attempt);
    }
  }

  /**
   * 特定の銘柄のデータを取得
   */
  async getDataForSymbol(symbol: string, types?: DataSourceType[]): Promise<CollectedData[]> {
    const relevantTypes = types || ['news', 'social', 'analyst'];
    
    return Array.from(this.dataCache.values()).filter((data) => {
      return relevantTypes.includes(data.type) && 
             (!data.symbol || data.symbol === symbol);
    });
  }

  /**
   * 統計情報を取得
   */
  getStats(): CollectionStats {
    return { ...this.collectionStats };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.dataCache.clear();
  }

  /**
   * データソースを追加
   */
  addSource(source: DataSourceConfig): void {
    this.config.sources.push(source);
    if (source.enabled && this.intervalHandles.size > 0) {
      this.scheduleCollection(source);
    }
  }

  /**
   * データソースを無効化
   */
  disableSource(type: DataSourceType): void {
    const source = this.config.sources.find((s) => s.type === type);
    if (source) {
      source.enabled = false;
      const handle = this.intervalHandles.get(type);
      if (handle) {
        clearInterval(handle);
        this.intervalHandles.delete(type);
      }
    }
  }

  // ============================================================================
  // Mock Data Generators
  // ============================================================================

  private generateMockNewsData(): unknown {
    return {
      articles: [
        {
          title: 'Market Analysis: Tech Stocks Rally',
          content: 'Technology stocks showed strong performance today...',
          source: 'Financial Times',
          timestamp: Date.now(),
          sentiment: 0.7
        }
      ]
    };
  }

  private generateMockSocialData(): unknown {
    return {
      posts: [
        {
          platform: 'twitter',
          content: 'Bullish on tech stocks! 📈',
          likes: 150,
          sentiment: 0.8
        }
      ]
    };
  }

  private generateMockEconomicData(): unknown {
    return {
      indicators: {
        gdp: 2.1,
        inflation: 3.2,
        unemployment: 3.8,
        interestRate: 5.25
      }
    };
  }

  private generateMockAnalystData(): unknown {
    return {
      ratings: [
        {
          analyst: 'Goldman Sachs',
          rating: 'Buy',
          targetPrice: 150,
          confidence: 0.85
        }
      ]
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

import { logger } from '@/app/core/logger';
const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<CollectorConfig>) => new AlternativeDataCollector(config)
);

export const getGlobalDataCollector = getInstance;
export const resetGlobalDataCollector = resetInstance;

export default AlternativeDataCollector;
