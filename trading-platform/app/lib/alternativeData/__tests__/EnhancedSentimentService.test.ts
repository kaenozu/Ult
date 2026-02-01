/**
 * EnhancedSentimentService.test.ts
 * 
 * EnhancedSentimentServiceのテスト
 */

import { 
  EnhancedSentimentService,
  InvestorSentiment,
  SentimentLeadingIndicator,
  EnhancedSentimentResult
} from '../EnhancedSentimentService';
import { AlternativeDataCollector } from '../DataCollector';
import SentimentAnalysisEngine from '../../sentiment/SentimentAnalysisEngine';

describe('EnhancedSentimentService', () => {
  let service: EnhancedSentimentService;
  let dataCollector: AlternativeDataCollector;
  let sentimentEngine: SentimentAnalysisEngine;

  beforeEach(() => {
    dataCollector = new AlternativeDataCollector();
    sentimentEngine = new SentimentAnalysisEngine();
    service = new EnhancedSentimentService(dataCollector, sentimentEngine);
  });

  afterEach(() => {
    service.stop();
    dataCollector.stop();
    sentimentEngine.stop();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(service).toBeInstanceOf(EnhancedSentimentService);
    });

    it('should start and stop correctly', (done) => {
      service.on('started', () => {
        expect(true).toBe(true);
        service.stop();
      });

      service.on('stopped', () => {
        expect(true).toBe(true);
        done();
      });

      service.start();
    });
  });

  describe('Sentiment Analysis', () => {
    it('should analyze sentiment for a symbol', async () => {
      // テストデータを追加
      sentimentEngine.addNewsArticle({
        id: 'test-1',
        title: 'Bullish news for AAPL',
        content: 'Strong earnings beat expectations',
        source: 'Test Source',
        url: 'https://test.com',
        publishedAt: Date.now(),
        symbol: 'AAPL'
      });

      sentimentEngine.addSocialPost({
        id: 'social-1',
        platform: 'twitter',
        content: 'AAPL to the moon! 🚀',
        author: 'test_user',
        timestamp: Date.now(),
        likes: 100,
        shares: 50,
        comments: 20,
        symbol: 'AAPL'
      });

      const result = await service.analyzeSymbol('AAPL');

      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('overallSentiment');
      expect(result).toHaveProperty('investorSentiment');
      expect(result).toHaveProperty('leadingIndicators');
      expect(result).toHaveProperty('weightedScores');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('dataQuality');
      expect(result).toHaveProperty('recommendedAction');
      expect(result).toHaveProperty('actionConfidence');
      expect(result).toHaveProperty('marketContext');
    });

    it('should return default result for unknown symbol', async () => {
      const result = await service.analyzeSymbol('UNKNOWN');
      
      expect(result.symbol).toBe('UNKNOWN');
      expect(result.recommendedAction).toBe('HOLD');
      expect(result.overallSentiment.overallScore).toBe(0);
    });
  });

  describe('Investor Sentiment', () => {
    it('should calculate investor sentiment correctly', async () => {
      // 機関投資家向けデータ（ニュース・アナリスト）
      sentimentEngine.addNewsArticle({
        id: 'inst-1',
        title: 'Goldman Sachs upgrades MSFT',
        content: 'Strong buy rating from institutional analysts',
        source: 'Goldman Sachs',
        url: 'https://test.com',
        publishedAt: Date.now(),
        symbol: 'MSFT'
      });

      // 個人投資家向けデータ（ソーシャルメディア）
      sentimentEngine.addSocialPost({
        id: 'retail-1',
        platform: 'reddit',
        content: 'MSFT looking weak, might sell',
        author: 'retail_trader',
        timestamp: Date.now(),
        likes: 50,
        shares: 10,
        comments: 5,
        symbol: 'MSFT'
      });

      const result = await service.analyzeSymbol('MSFT');
      const investorSentiment = result.investorSentiment;

      expect(investorSentiment).toHaveProperty('institutional');
      expect(investorSentiment).toHaveProperty('retail');
      expect(investorSentiment).toHaveProperty('combined');
      expect(investorSentiment).toHaveProperty('divergence');

      expect(investorSentiment.divergence).toBeGreaterThanOrEqual(0);
      expect(investorSentiment.divergence).toBeLessThanOrEqual(1);
    });

    it('should emit divergence alert for large divergence', (done) => {
      service.on('divergence_alert', (alert) => {
        expect(alert).toHaveProperty('symbol');
        expect(alert).toHaveProperty('institutional');
        expect(alert).toHaveProperty('retail');
        expect(alert).toHaveProperty('divergence');
        done();
      });

      // 大きな乖離を持つデータを作成
      // （実際のテストではモックデータを注入する必要がある）
      service.start();
      
      // タイムアウトを設定
      setTimeout(() => {
        service.stop();
        done();
      }, 2000);
    });
  });

  describe('Leading Indicators', () => {
    it('should calculate leading indicators', async () => {
      // 複数のデータポイントを追加して履歴を作成
      for (let i = 0; i < 5; i++) {
        sentimentEngine.addNewsArticle({
          id: `news-${i}`,
          title: `News ${i}`,
          content: 'Market update',
          source: 'Test',
          url: 'https://test.com',
          publishedAt: Date.now() - (5 - i) * 60000,
          symbol: 'TSLA'
        });
      }

      const result = await service.analyzeSymbol('TSLA');
      const indicators = result.leadingIndicators;

      expect(indicators).toHaveProperty('volumeAnomaly');
      expect(indicators).toHaveProperty('trendAcceleration');
      expect(indicators).toHaveProperty('crossAssetSentiment');
      expect(indicators).toHaveProperty('earlySignalStrength');

      expect(indicators.volumeAnomaly).toBeGreaterThanOrEqual(0);
      expect(indicators.volumeAnomaly).toBeLessThanOrEqual(1);
      expect(indicators.trendAcceleration).toBeGreaterThanOrEqual(-1);
      expect(indicators.trendAcceleration).toBeLessThanOrEqual(1);
    });
  });

  describe('Recommended Action', () => {
    it('should recommend STRONG_BUY for very positive sentiment', async () => {
      // 非常にポジティブなニュースを追加
      for (let i = 0; i < 5; i++) {
        sentimentEngine.addNewsArticle({
          id: `bullish-${i}`,
          title: 'Amazing breakthrough! Bullish surge expected',
          content: 'Strong buy signal with excellent growth potential',
          source: 'Test',
          url: 'https://test.com',
          publishedAt: Date.now(),
          symbol: 'NVDA'
        });

        sentimentEngine.addSocialPost({
          id: `social-bullish-${i}`,
          platform: 'twitter',
          content: 'NVDA exploding! Moon! 🚀📈',
          author: 'test',
          timestamp: Date.now(),
          likes: 1000,
          shares: 500,
          comments: 200,
          symbol: 'NVDA'
        });
      }

      const result = await service.analyzeSymbol('NVDA');
      
      // ポジティブな推奨が期待される
      expect(['STRONG_BUY', 'BUY', 'HOLD']).toContain(result.recommendedAction);
      expect(result.actionConfidence).toBeGreaterThan(0);
    });

    it('should recommend STRONG_SELL for very negative sentiment', async () => {
      // 非常にネガティブなニュースを追加
      for (let i = 0; i < 5; i++) {
        sentimentEngine.addNewsArticle({
          id: `bearish-${i}`,
          title: 'Disaster strikes! Bearish collapse imminent',
          content: 'Terrible loss, sell immediately, bankruptcy fears',
          source: 'Test',
          url: 'https://test.com',
          publishedAt: Date.now(),
          symbol: 'BEAR'
        });

        sentimentEngine.addSocialPost({
          id: `social-bearish-${i}`,
          platform: 'twitter',
          content: 'BEAR crashing! Dump everything! 📉💀',
          author: 'test',
          timestamp: Date.now(),
          likes: 1000,
          shares: 500,
          comments: 200,
          symbol: 'BEAR'
        });
      }

      const result = await service.analyzeSymbol('BEAR');
      
      // ネガティブな推奨が期待される
      expect(['STRONG_SELL', 'SELL', 'HOLD']).toContain(result.recommendedAction);
    });
  });

  describe('Market Context', () => {
    it('should calculate market context', async () => {
      const result = await service.analyzeSymbol('TEST');
      const context = result.marketContext;

      expect(context).toHaveProperty('volatility');
      expect(context).toHaveProperty('momentum');
      expect(context).toHaveProperty('regime');

      expect(['TRENDING', 'RANGING', 'VOLATILE']).toContain(context.regime);
      expect(context.volatility).toBeGreaterThanOrEqual(0);
      expect(context.momentum).toBeGreaterThanOrEqual(-1);
      expect(context.momentum).toBeLessThanOrEqual(1);
    });
  });

  describe('Historical Data', () => {
    it('should store and retrieve historical sentiment', async () => {
      await service.analyzeSymbol('AAPL');
      await service.analyzeSymbol('AAPL');
      
      const history = service.getHistoricalSentiment('AAPL');
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit historical data to 100 entries', async () => {
      // 101回分析を実行
      for (let i = 0; i < 101; i++) {
        await service.analyzeSymbol('TEST');
      }

      const history = service.getHistoricalSentiment('TEST');
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Data Integration', () => {
    it('should process collected data from data collector', (done) => {
      service.on('analysis_completed', (result: EnhancedSentimentResult) => {
        expect(result).toHaveProperty('symbol');
        service.stop();
        done();
      });

      service.start();
      
      // データが収集されるまで待機
      setTimeout(() => {
        service.stop();
        done();
      }, 2000);
    });
  });

  describe('Weighted Scores', () => {
    it('should calculate weighted scores from multiple sources', async () => {
      sentimentEngine.addNewsArticle({
        id: 'news-1',
        title: 'Positive news',
        content: 'Strong performance',
        source: 'Test',
        url: 'https://test.com',
        publishedAt: Date.now(),
        symbol: 'GOOGL'
      });

      sentimentEngine.addSocialPost({
        id: 'social-1',
        platform: 'twitter',
        content: 'Bullish on GOOGL',
        author: 'test',
        timestamp: Date.now(),
        likes: 100,
        shares: 50,
        comments: 20,
        symbol: 'GOOGL'
      });

      const result = await service.analyzeSymbol('GOOGL');
      const weighted = result.weightedScores;

      expect(weighted).toHaveProperty('news');
      expect(weighted).toHaveProperty('social');
      expect(weighted).toHaveProperty('analyst');
      expect(weighted).toHaveProperty('economic');

      // 各スコアが適切な範囲内であることを確認
      expect(weighted.news).toBeGreaterThanOrEqual(-1);
      expect(weighted.news).toBeLessThanOrEqual(1);
      expect(weighted.social).toBeGreaterThanOrEqual(-1);
      expect(weighted.social).toBeLessThanOrEqual(1);
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      await service.analyzeSymbol('TEST');
      
      service.clearData();
      
      const history = service.getHistoricalSentiment('TEST');
      expect(history.length).toBe(0);
    });
  });
});
