/**
 * EnhancedSentimentService.ts
 * 
 * 強化されたセンチメント分析サービス - AlternativeDataCollectorとSentimentAnalysisEngineを統合し、
 * より包括的なセンチメント分析を提供します。
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
import { AlternativeDataCollector, CollectedData, DataSourceType } from './DataCollector';
import SentimentAnalysisEngine, { 
  NewsArticle, 
  SocialMediaPost, 
  AggregatedSentiment 
} from '../sentiment/SentimentAnalysisEngine';

// ============================================================================
// Types
// ============================================================================

/**
 * 投資家タイプ別センチメント
 */
export interface InvestorSentiment {
  institutional: number; // 機関投資家のセンチメント (-1 to 1)
  retail: number;        // 個人投資家のセンチメント (-1 to 1)
  combined: number;      // 統合センチメント (-1 to 1)
  divergence: number;    // 乖離度 (0 to 1)
}

/**
 * センチメント先行指標
 */
export interface SentimentLeadingIndicator {
  volumeAnomaly: number;        // ボリューム異常度 (0 to 1)
  trendAcceleration: number;    // トレンド加速度 (-1 to 1)
  crossAssetSentiment: number;  // クロスアセットセンチメント (-1 to 1)
  earlySignalStrength: number;  // 早期シグナル強度 (0 to 1)
}

/**
 * 統合センチメント分析結果
 */
export interface EnhancedSentimentResult {
  symbol: string;
  timestamp: number;
  
  // 基本センチメント
  overallSentiment: AggregatedSentiment;
  
  // 投資家タイプ別
  investorSentiment: InvestorSentiment;
  
  // 先行指標
  leadingIndicators: SentimentLeadingIndicator;
  
  // データソース別の重み付けスコア
  weightedScores: {
    news: number;
    social: number;
    analyst: number;
    economic: number;
  };
  
  // 信頼度と品質
  confidence: number;
  dataQuality: number;
  
  // アクションアドバイス
  recommendedAction: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  actionConfidence: number;
  
  // 追加情報
  marketContext: {
    volatility: number;
    momentum: number;
    regime: 'TRENDING' | 'RANGING' | 'VOLATILE';
  };
}

/**
 * サービス設定
 */
export interface EnhancedSentimentConfig {
  updateInterval: number; // 更新間隔（ミリ秒）
  dataWeights: {
    news: number;
    social: number;
    analyst: number;
    economic: number;
  };
  divergenceThreshold: number; // 乖離警告閾値
  leadingIndicatorSensitivity: number; // 先行指標の感度 (0-1)
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: EnhancedSentimentConfig = {
  updateInterval: 60000, // 1分
  dataWeights: {
    news: 0.35,
    social: 0.25,
    analyst: 0.25,
    economic: 0.15
  },
  divergenceThreshold: 0.4,
  leadingIndicatorSensitivity: 0.7
};

// ============================================================================
// EnhancedSentimentService Class
// ============================================================================

export class EnhancedSentimentService extends EventEmitter {
  private config: EnhancedSentimentConfig;
  private dataCollector: AlternativeDataCollector;
  private sentimentEngine: SentimentAnalysisEngine;
  private analysisCache: Map<string, EnhancedSentimentResult> = new Map();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private historicalSentiments: Map<string, EnhancedSentimentResult[]> = new Map();

  constructor(
    dataCollector: AlternativeDataCollector,
    sentimentEngine: SentimentAnalysisEngine,
    config: Partial<EnhancedSentimentConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataCollector = dataCollector;
    this.sentimentEngine = sentimentEngine;

    // データ収集イベントをリスン
    this.dataCollector.on('data_collected', (data: CollectedData) => {
      this.processCollectedData(data);
    });
  }

  /**
   * サービスを開始
   */
  start(): void {
    console.log('[EnhancedSentimentService] Starting...');
    
    // データコレクターとセンチメントエンジンを開始
    this.dataCollector.start();
    this.sentimentEngine.start();

    // 定期更新を設定
    this.updateInterval = setInterval(() => {
      this.updateAllAnalyses();
    }, this.config.updateInterval);

    this.emit('started');
  }

  /**
   * サービスを停止
   */
  stop(): void {
    console.log('[EnhancedSentimentService] Stopping...');
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.dataCollector.stop();
    this.sentimentEngine.stop();

    this.emit('stopped');
  }

  /**
   * 収集されたデータを処理
   */
  private processCollectedData(data: CollectedData): void {
    try {
      switch (data.type) {
        case 'news':
          this.processNewsData(data);
          break;
        case 'social':
          this.processSocialData(data);
          break;
        case 'analyst':
          this.processAnalystData(data);
          break;
        case 'economic':
          this.processEconomicData(data);
          break;
      }
    } catch (error) {
      console.error('[EnhancedSentimentService] Error processing data:', error);
      this.emit('processing_error', { data, error });
    }
  }

  /**
   * ニュースデータを処理
   */
  private processNewsData(data: CollectedData): void {
    const newsData = data.data as { articles?: Array<{ title: string; content: string; source: string; timestamp: number; sentiment?: number }> };
    
    if (newsData.articles) {
      newsData.articles.forEach((article) => {
        const newsArticle: NewsArticle = {
          id: `news-${article.timestamp}`,
          title: article.title,
          content: article.content,
          source: article.source,
          url: `https://example.com/news/${article.timestamp}`,
          publishedAt: article.timestamp
        };
        
        this.sentimentEngine.addNewsArticle(newsArticle);
      });
    }
  }

  /**
   * ソーシャルメディアデータを処理
   */
  private processSocialData(data: CollectedData): void {
    const socialData = data.data as { posts?: Array<{ platform: string; content: string; likes: number; sentiment?: number }> };
    
    if (socialData.posts) {
      socialData.posts.forEach((post, index) => {
        const socialPost: SocialMediaPost = {
          id: `social-${data.timestamp}-${index}`,
          platform: 'twitter',
          content: post.content,
          author: 'anonymous',
          timestamp: data.timestamp,
          likes: post.likes,
          shares: 0,
          comments: 0
        };
        
        this.sentimentEngine.addSocialPost(socialPost);
      });
    }
  }

  /**
   * アナリストデータを処理
   */
  private processAnalystData(data: CollectedData): void {
    // アナリストレーティングをニュース記事として追加
    const analystData = data.data as { ratings?: Array<{ analyst: string; rating: string; targetPrice: number; confidence: number }> };
    
    if (analystData.ratings) {
      analystData.ratings.forEach((rating, index) => {
        const article: NewsArticle = {
          id: `analyst-${data.timestamp}-${index}`,
          title: `${rating.analyst} rates ${rating.rating}`,
          content: `Target price: $${rating.targetPrice}`,
          source: rating.analyst,
          url: `https://example.com/analyst/${data.timestamp}`,
          publishedAt: data.timestamp
        };
        
        this.sentimentEngine.addNewsArticle(article);
      });
    }
  }

  /**
   * 経済データを処理
   */
  private processEconomicData(data: CollectedData): void {
    // 経済指標データは直接的にはセンチメントエンジンに追加しない
    // 代わりに市場コンテキストとして保持
    this.emit('economic_data_processed', data);
  }

  /**
   * 特定銘柄の強化されたセンチメント分析を取得
   */
  async analyzeSymbol(symbol: string): Promise<EnhancedSentimentResult> {
    // キャッシュをチェック
    const cached = this.analysisCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp) < this.config.updateInterval) {
      return cached;
    }

    // 基本センチメント分析を取得
    const overallSentiment = this.sentimentEngine.getCurrentSentiment(symbol);
    
    if (!overallSentiment) {
      // デフォルト値を返す
      return this.createDefaultResult(symbol);
    }

    // 投資家タイプ別センチメントを計算
    const investorSentiment = this.calculateInvestorSentiment(symbol, overallSentiment);
    
    // 先行指標を計算
    const leadingIndicators = this.calculateLeadingIndicators(symbol);
    
    // データソース別の重み付けスコアを計算
    const weightedScores = this.calculateWeightedScores(overallSentiment);
    
    // 信頼度とデータ品質を計算
    const confidence = overallSentiment.confidence;
    const dataQuality = await this.calculateDataQuality(symbol);
    
    // アクション推奨を計算
    const { recommendedAction, actionConfidence } = this.calculateRecommendedAction(
      overallSentiment,
      investorSentiment,
      leadingIndicators
    );
    
    // 市場コンテキストを計算
    const marketContext = this.calculateMarketContext(symbol);

    const result: EnhancedSentimentResult = {
      symbol,
      timestamp: Date.now(),
      overallSentiment,
      investorSentiment,
      leadingIndicators,
      weightedScores,
      confidence,
      dataQuality,
      recommendedAction,
      actionConfidence,
      marketContext
    };

    // キャッシュと履歴に保存
    this.analysisCache.set(symbol, result);
    this.storeHistoricalSentiment(symbol, result);

    this.emit('analysis_completed', result);

    return result;
  }

  /**
   * 投資家タイプ別センチメントを計算
   */
  private calculateInvestorSentiment(symbol: string, overallSentiment: AggregatedSentiment): InvestorSentiment {
    // ニュースとアナリストは主に機関投資家の意見を反映
    const institutional = (
      overallSentiment.sources.news.score * 0.6 +
      overallSentiment.sources.analyst.score * 0.4
    );

    // ソーシャルメディアは主に個人投資家の意見を反映
    const retail = overallSentiment.sources.social.score;

    // 統合センチメント
    const combined = (institutional * 0.6 + retail * 0.4);

    // 乖離度（機関と個人の意見の違い）
    const divergence = Math.abs(institutional - retail);

    // 乖離が大きい場合は警告を発する
    if (divergence > this.config.divergenceThreshold) {
      this.emit('divergence_alert', {
        symbol,
        institutional,
        retail,
        divergence
      });
    }

    return {
      institutional,
      retail,
      combined,
      divergence
    };
  }

  /**
   * センチメント先行指標を計算
   */
  private calculateLeadingIndicators(symbol: string): SentimentLeadingIndicator {
    const history = this.historicalSentiments.get(symbol) || [];
    
    // ボリューム異常度
    const volumeAnomaly = this.detectVolumeAnomaly(symbol, history);
    
    // トレンド加速度
    const trendAcceleration = this.calculateTrendAcceleration(history);
    
    // クロスアセットセンチメント（他の市場との相関）
    const crossAssetSentiment = this.calculateCrossAssetSentiment(symbol);
    
    // 早期シグナル強度
    const earlySignalStrength = this.calculateEarlySignalStrength(
      volumeAnomaly,
      trendAcceleration,
      crossAssetSentiment
    );

    return {
      volumeAnomaly,
      trendAcceleration,
      crossAssetSentiment,
      earlySignalStrength
    };
  }

  /**
   * ボリューム異常を検出
   */
  private detectVolumeAnomaly(symbol: string, history: EnhancedSentimentResult[]): number {
    if (history.length < 5) return 0;

    const recentVolumes = history.slice(-5).map((h) => h.overallSentiment.volume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = recentVolumes[recentVolumes.length - 1];

    if (avgVolume === 0) return 0;

    const anomaly = (currentVolume - avgVolume) / avgVolume;
    return Math.max(0, Math.min(1, anomaly)); // 0-1に正規化
  }

  /**
   * トレンド加速度を計算
   */
  private calculateTrendAcceleration(history: EnhancedSentimentResult[]): number {
    if (history.length < 3) return 0;

    const scores = history.slice(-3).map((h) => h.overallSentiment.overallScore);
    
    // 一次微分（速度）
    const velocity1 = scores[1] - scores[0];
    const velocity2 = scores[2] - scores[1];
    
    // 二次微分（加速度）
    const acceleration = velocity2 - velocity1;

    return Math.max(-1, Math.min(1, acceleration));
  }

  /**
   * クロスアセットセンチメントを計算
   */
  private calculateCrossAssetSentiment(symbol: string): number {
    // 実際には他の関連資産のセンチメントを分析
    // ここでは簡略化してランダム値を返す
    return (Math.random() - 0.5) * 2; // -1 to 1
  }

  /**
   * 早期シグナル強度を計算
   */
  private calculateEarlySignalStrength(
    volumeAnomaly: number,
    trendAcceleration: number,
    crossAssetSentiment: number
  ): number {
    const sensitivity = this.config.leadingIndicatorSensitivity;
    
    const strength = (
      volumeAnomaly * 0.4 +
      Math.abs(trendAcceleration) * 0.4 +
      (crossAssetSentiment + 1) / 2 * 0.2
    ) * sensitivity;

    return Math.max(0, Math.min(1, strength));
  }

  /**
   * データソース別の重み付けスコアを計算
   */
  private calculateWeightedScores(sentiment: AggregatedSentiment): {
    news: number;
    social: number;
    analyst: number;
    economic: number;
  } {
    return {
      news: sentiment.sources.news.score * this.config.dataWeights.news,
      social: sentiment.sources.social.score * this.config.dataWeights.social,
      analyst: sentiment.sources.analyst.score * this.config.dataWeights.analyst,
      economic: 0 // 経済指標は別途処理
    };
  }

  /**
   * データ品質を計算
   */
  private async calculateDataQuality(symbol: string): Promise<number> {
    const collectorStats = this.dataCollector.getStats();
    return collectorStats.averageQuality;
  }

  /**
   * 推奨アクションを計算
   */
  private calculateRecommendedAction(
    overallSentiment: AggregatedSentiment,
    investorSentiment: InvestorSentiment,
    leadingIndicators: SentimentLeadingIndicator
  ): { recommendedAction: EnhancedSentimentResult['recommendedAction']; actionConfidence: number } {
    const score = overallSentiment.overallScore;
    const earlySignal = leadingIndicators.earlySignalStrength;
    const combined = investorSentiment.combined;

    // 総合スコアを計算
    const totalScore = (score * 0.5 + combined * 0.3 + earlySignal * 0.2);

    let recommendedAction: EnhancedSentimentResult['recommendedAction'];
    let actionConfidence: number;

    if (totalScore > 0.6) {
      recommendedAction = 'STRONG_BUY';
      actionConfidence = Math.min(0.95, totalScore);
    } else if (totalScore > 0.2) {
      recommendedAction = 'BUY';
      actionConfidence = 0.7 + (totalScore - 0.2) * 0.5;
    } else if (totalScore > -0.2) {
      recommendedAction = 'HOLD';
      actionConfidence = 0.6;
    } else if (totalScore > -0.6) {
      recommendedAction = 'SELL';
      actionConfidence = 0.7 + Math.abs(totalScore + 0.2) * 0.5;
    } else {
      recommendedAction = 'STRONG_SELL';
      actionConfidence = Math.min(0.95, Math.abs(totalScore));
    }

    return { recommendedAction, actionConfidence };
  }

  /**
   * 市場コンテキストを計算
   */
  private calculateMarketContext(symbol: string): EnhancedSentimentResult['marketContext'] {
    const trend = this.sentimentEngine.analyzeTrend(symbol);
    const history = this.historicalSentiments.get(symbol) || [];

    // ボラティリティ
    const volatility = this.calculateVolatility(history);

    // モメンタム
    const momentum = trend.momentum / 100; // -1 to 1に正規化

    // レジーム
    let regime: 'TRENDING' | 'RANGING' | 'VOLATILE';
    if (volatility > 0.5) {
      regime = 'VOLATILE';
    } else if (Math.abs(momentum) > 0.3) {
      regime = 'TRENDING';
    } else {
      regime = 'RANGING';
    }

    return {
      volatility,
      momentum,
      regime
    };
  }

  /**
   * ボラティリティを計算
   */
  private calculateVolatility(history: EnhancedSentimentResult[]): number {
    if (history.length < 2) return 0;

    const scores = history.slice(-10).map((h) => h.overallSentiment.overallScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }

  /**
   * デフォルト結果を作成
   */
  private createDefaultResult(symbol: string): EnhancedSentimentResult {
    return {
      symbol,
      timestamp: Date.now(),
      overallSentiment: {
        symbol,
        overallScore: 0,
        overallMagnitude: 0,
        confidence: 0,
        trend: 'stable',
        volume: 0,
        sources: {
          news: { score: 0, magnitude: 0, confidence: 0, label: 'neutral' },
          social: { score: 0, magnitude: 0, confidence: 0, label: 'neutral' },
          analyst: { score: 0, magnitude: 0, confidence: 0, label: 'neutral' }
        },
        keywords: [],
        timestamp: Date.now()
      },
      investorSentiment: {
        institutional: 0,
        retail: 0,
        combined: 0,
        divergence: 0
      },
      leadingIndicators: {
        volumeAnomaly: 0,
        trendAcceleration: 0,
        crossAssetSentiment: 0,
        earlySignalStrength: 0
      },
      weightedScores: {
        news: 0,
        social: 0,
        analyst: 0,
        economic: 0
      },
      confidence: 0,
      dataQuality: 0,
      recommendedAction: 'HOLD',
      actionConfidence: 0.5,
      marketContext: {
        volatility: 0,
        momentum: 0,
        regime: 'RANGING'
      }
    };
  }

  /**
   * 履歴センチメントを保存
   */
  private storeHistoricalSentiment(symbol: string, result: EnhancedSentimentResult): void {
    if (!this.historicalSentiments.has(symbol)) {
      this.historicalSentiments.set(symbol, []);
    }

    const history = this.historicalSentiments.get(symbol)!;
    history.push(result);

    // 最新100件のみ保持
    if (history.length > 100) {
      this.historicalSentiments.set(symbol, history.slice(-100));
    }
  }

  /**
   * 全銘柄の分析を更新
   */
  private async updateAllAnalyses(): Promise<void> {
    const allSentiments = this.sentimentEngine.getAllSentiments();
    
    for (const [symbol] of allSentiments) {
      try {
        await this.analyzeSymbol(symbol);
      } catch (error) {
        console.error(`[EnhancedSentimentService] Error updating ${symbol}:`, error);
      }
    }
  }

  /**
   * 履歴データを取得
   */
  getHistoricalSentiment(symbol: string): EnhancedSentimentResult[] {
    return this.historicalSentiments.get(symbol) || [];
  }

  /**
   * データをクリア
   */
  clearData(): void {
    this.analysisCache.clear();
    this.historicalSentiments.clear();
    this.dataCollector.clearCache();
    this.sentimentEngine.clearData();
    console.log('[EnhancedSentimentService] Data cleared');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';
import { getGlobalDataCollector } from './DataCollector';
import { getGlobalSentimentEngine } from '../sentiment/SentimentAnalysisEngine';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<EnhancedSentimentConfig>) => {
    const collector = getGlobalDataCollector();
    const engine = getGlobalSentimentEngine();
    return new EnhancedSentimentService(collector, engine, config);
  }
);

export const getGlobalEnhancedSentimentService = getInstance;
export const resetGlobalEnhancedSentimentService = resetInstance;

export default EnhancedSentimentService;
