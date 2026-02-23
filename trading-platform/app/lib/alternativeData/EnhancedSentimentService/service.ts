import { logger } from '@/app/core/logger';
import { AlternativeDataCollector, CollectedData } from '../DataCollector';
import SentimentAnalysisEngine, { NewsArticle, SocialMediaPost, AggregatedSentiment } from '../../sentiment/SentimentAnalysisEngine';
import { EnhancedSentimentResult, EnhancedSentimentConfig, DEFAULT_CONFIG, InvestorSentiment, SentimentLeadingIndicator, EventEmitter } from './types';

export class EnhancedSentimentCore extends EventEmitter {
  protected config: EnhancedSentimentConfig;
  protected dataCollector: AlternativeDataCollector;
  protected sentimentEngine: SentimentAnalysisEngine;
  protected analysisCache: Map<string, EnhancedSentimentResult> = new Map();
  protected updateInterval: ReturnType<typeof setInterval> | null = null;
  protected historicalSentiments: Map<string, EnhancedSentimentResult[]> = new Map();

  constructor(dataCollector: AlternativeDataCollector, sentimentEngine: SentimentAnalysisEngine, config: Partial<EnhancedSentimentConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataCollector = dataCollector;
    this.sentimentEngine = sentimentEngine;
    this.dataCollector.on('data_collected', (data: CollectedData) => { this.processCollectedData(data); });
  }

  start(): void {
    this.dataCollector.start();
    this.sentimentEngine.start();
    this.updateInterval = setInterval(() => { this.updateAllAnalyses(); }, this.config.updateInterval);
    this.emit('started');
  }

  stop(): void {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    this.dataCollector.stop();
    this.sentimentEngine.stop();
    this.emit('stopped');
  }

  protected processCollectedData(data: CollectedData): void {
    try {
      switch (data.type) {
        case 'news': this.processNewsData(data); break;
        case 'social': this.processSocialData(data); break;
        case 'analyst': this.processAnalystData(data); break;
        case 'economic': this.processEconomicData(data); break;
      }
    } catch (error) {
      logger.error('[EnhancedSentimentService] Error processing data:', error instanceof Error ? error : new Error(String(error)));
      this.emit('processing_error', { data, error });
    }
  }

  protected processNewsData(data: CollectedData): void {
    const newsData = data.data as { articles?: Array<{ title: string; content: string; source: string; timestamp: number }> };
    if (newsData.articles) {
      newsData.articles.forEach((article) => {
        const newsArticle: NewsArticle = { id: `news-${article.timestamp}`, title: article.title, content: article.content, source: article.source, url: `https://example.com/news/${article.timestamp}`, publishedAt: article.timestamp };
        this.sentimentEngine.addNewsArticle(newsArticle);
      });
    }
  }

  protected processSocialData(data: CollectedData): void {
    const socialData = data.data as { posts?: Array<{ platform: string; content: string; likes: number }> };
    if (socialData.posts) {
      socialData.posts.forEach((post, index) => {
        const socialPost: SocialMediaPost = { id: `social-${data.timestamp}-${index}`, platform: 'twitter', content: post.content, author: 'anonymous', timestamp: data.timestamp, likes: post.likes, shares: 0, comments: 0 };
        this.sentimentEngine.addSocialPost(socialPost);
      });
    }
  }

  protected processAnalystData(data: CollectedData): void {
    const analystData = data.data as { ratings?: Array<{ analyst: string; rating: string; targetPrice: number }> };
    if (analystData.ratings) {
      analystData.ratings.forEach((rating, index) => {
        const article: NewsArticle = { id: `analyst-${data.timestamp}-${index}`, title: `${rating.analyst} rates ${rating.rating}`, content: `Target price: $${rating.targetPrice}`, source: rating.analyst, url: `https://example.com/analyst/${data.timestamp}`, publishedAt: data.timestamp };
        this.sentimentEngine.addNewsArticle(article);
      });
    }
  }

  protected processEconomicData(data: CollectedData): void {
    this.emit('economic_data_processed', data);
  }

  protected calculateInvestorSentiment(symbol: string, overallSentiment: AggregatedSentiment): InvestorSentiment {
    const institutional = overallSentiment.sources.news.score * 0.6 + overallSentiment.sources.analyst.score * 0.4;
    const retail = overallSentiment.sources.social.score;
    const combined = institutional * 0.6 + retail * 0.4;
    const divergence = Math.abs(institutional - retail);
    if (divergence > this.config.divergenceThreshold) this.emit('divergence_alert', { symbol, institutional, retail, divergence });
    return { institutional, retail, combined, divergence };
  }

  protected calculateLeadingIndicators(symbol: string): SentimentLeadingIndicator {
    const history = this.historicalSentiments.get(symbol) || [];
    const volumeAnomaly = this.detectVolumeAnomaly(symbol, history);
    const trendAcceleration = this.calculateTrendAcceleration(history);
    const crossAssetSentiment = this.calculateCrossAssetSentiment(symbol);
    const earlySignalStrength = this.calculateEarlySignalStrength(volumeAnomaly, trendAcceleration, crossAssetSentiment);
    return { volumeAnomaly, trendAcceleration, crossAssetSentiment, earlySignalStrength };
  }

  protected detectVolumeAnomaly(symbol: string, history: EnhancedSentimentResult[]): number {
    if (history.length < 5) return 0;
    const recentVolumes = history.slice(-5).map((h) => h.overallSentiment.volume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    if (avgVolume === 0) return 0;
    const anomaly = (currentVolume - avgVolume) / avgVolume;
    return Math.max(0, Math.min(1, anomaly));
  }

  protected calculateTrendAcceleration(history: EnhancedSentimentResult[]): number {
    if (history.length < 3) return 0;
    const scores = history.slice(-3).map((h) => h.overallSentiment.overallScore);
    const velocity1 = scores[1] - scores[0];
    const velocity2 = scores[2] - scores[1];
    return Math.max(-1, Math.min(1, velocity2 - velocity1));
  }

  protected calculateCrossAssetSentiment(symbol: string): number {
    return (Math.random() - 0.5) * 2;
  }

  protected calculateEarlySignalStrength(volumeAnomaly: number, trendAcceleration: number, crossAssetSentiment: number): number {
    const sensitivity = this.config.leadingIndicatorSensitivity;
    const strength = (volumeAnomaly * 0.4 + Math.abs(trendAcceleration) * 0.4 + (crossAssetSentiment + 1) / 2 * 0.2) * sensitivity;
    return Math.max(0, Math.min(1, strength));
  }

  protected calculateWeightedScores(sentiment: AggregatedSentiment): { news: number; social: number; analyst: number; economic: number } {
    return {
      news: sentiment.sources.news.score * this.config.dataWeights.news,
      social: sentiment.sources.social.score * this.config.dataWeights.social,
      analyst: sentiment.sources.analyst.score * this.config.dataWeights.analyst,
      economic: 0
    };
  }

  protected async calculateDataQuality(symbol: string): Promise<number> {
    const collectorStats = this.dataCollector.getStats();
    return collectorStats.averageQuality;
  }

  protected calculateRecommendedAction(overallSentiment: AggregatedSentiment, investorSentiment: InvestorSentiment, leadingIndicators: SentimentLeadingIndicator): { recommendedAction: EnhancedSentimentResult['recommendedAction']; actionConfidence: number } {
    const score = overallSentiment.overallScore;
    const earlySignal = leadingIndicators.earlySignalStrength;
    const combined = investorSentiment.combined;
    const totalScore = score * 0.5 + combined * 0.3 + earlySignal * 0.2;

    let recommendedAction: EnhancedSentimentResult['recommendedAction'];
    let actionConfidence: number;

    if (totalScore > 0.6) { recommendedAction = 'STRONG_BUY'; actionConfidence = Math.min(0.95, totalScore); }
    else if (totalScore > 0.2) { recommendedAction = 'BUY'; actionConfidence = 0.7 + (totalScore - 0.2) * 0.5; }
    else if (totalScore > -0.2) { recommendedAction = 'HOLD'; actionConfidence = 0.6; }
    else if (totalScore > -0.6) { recommendedAction = 'SELL'; actionConfidence = 0.7 + Math.abs(totalScore + 0.2) * 0.5; }
    else { recommendedAction = 'STRONG_SELL'; actionConfidence = Math.min(0.95, Math.abs(totalScore)); }

    return { recommendedAction, actionConfidence };
  }

  protected calculateMarketContext(symbol: string): EnhancedSentimentResult['marketContext'] {
    const trend = this.sentimentEngine.analyzeTrend(symbol);
    const history = this.historicalSentiments.get(symbol) || [];
    const volatility = this.calculateVolatility(history);
    const momentum = trend.momentum / 100;

    let regime: 'TRENDING' | 'RANGING' | 'VOLATILE';
    if (volatility > 0.5) regime = 'VOLATILE';
    else if (Math.abs(momentum) > 0.3) regime = 'TRENDING';
    else regime = 'RANGING';

    return { volatility, momentum, regime };
  }

  protected calculateVolatility(history: EnhancedSentimentResult[]): number {
    if (history.length < 2) return 0;
    const scores = history.slice(-10).map((h) => h.overallSentiment.overallScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  protected createDefaultResult(symbol: string): EnhancedSentimentResult {
    return {
      symbol, timestamp: Date.now(),
      overallSentiment: { symbol, overallScore: 0, overallMagnitude: 0, confidence: 0, trend: 'stable', volume: 0, sources: { news: { score: 0, magnitude: 0, confidence: 0, label: 'neutral' }, social: { score: 0, magnitude: 0, confidence: 0, label: 'neutral' }, analyst: { score: 0, magnitude: 0, confidence: 0, label: 'neutral' } }, keywords: [], timestamp: Date.now() },
      investorSentiment: { institutional: 0, retail: 0, combined: 0, divergence: 0 },
      leadingIndicators: { volumeAnomaly: 0, trendAcceleration: 0, crossAssetSentiment: 0, earlySignalStrength: 0 },
      weightedScores: { news: 0, social: 0, analyst: 0, economic: 0 },
      confidence: 0, dataQuality: 0,
      recommendedAction: 'HOLD', actionConfidence: 0.5,
      marketContext: { volatility: 0, momentum: 0, regime: 'RANGING' }
    };
  }

  protected storeHistoricalSentiment(symbol: string, result: EnhancedSentimentResult): void {
    if (!this.historicalSentiments.has(symbol)) this.historicalSentiments.set(symbol, []);
    const history = this.historicalSentiments.get(symbol)!;
    history.push(result);
    if (history.length > 100) this.historicalSentiments.set(symbol, history.slice(-100));
  }

  protected async updateAllAnalyses(): Promise<void> {
    const allSentiments = this.sentimentEngine.getAllSentiments();
    for (const [symbol] of allSentiments) {
      try { await this.analyzeSymbol(symbol); }
      catch (error) { logger.error(`[EnhancedSentimentService] Error updating ${symbol}:`, error instanceof Error ? error : new Error(String(error))); }
    }
  }

  getHistoricalSentiment(symbol: string): EnhancedSentimentResult[] {
    return this.historicalSentiments.get(symbol) || [];
  }

  clearData(): void {
    this.analysisCache.clear();
    this.historicalSentiments.clear();
    this.dataCollector.clearCache();
    this.sentimentEngine.clearData();
  }

  async analyzeSymbol(symbol: string): Promise<EnhancedSentimentResult> {
    const cached = this.analysisCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp) < this.config.updateInterval) return cached;

    const overallSentiment = this.sentimentEngine.getCurrentSentiment(symbol);
    if (!overallSentiment) return this.createDefaultResult(symbol);

    const investorSentiment = this.calculateInvestorSentiment(symbol, overallSentiment);
    const leadingIndicators = this.calculateLeadingIndicators(symbol);
    const weightedScores = this.calculateWeightedScores(overallSentiment);
    const confidence = overallSentiment.confidence;
    const dataQuality = await this.calculateDataQuality(symbol);
    const { recommendedAction, actionConfidence } = this.calculateRecommendedAction(overallSentiment, investorSentiment, leadingIndicators);
    const marketContext = this.calculateMarketContext(symbol);

    const result: EnhancedSentimentResult = { symbol, timestamp: Date.now(), overallSentiment, investorSentiment, leadingIndicators, weightedScores, confidence, dataQuality, recommendedAction, actionConfidence, marketContext };
    this.analysisCache.set(symbol, result);
    this.storeHistoricalSentiment(symbol, result);
    this.emit('analysis_completed', result);
    return result;
  }
}
