# TRADING-011: 自然言語処理（NLP）によるニュース・ソーシャルメディア分析

## 概要
自然言語処理（NLP）を活用して、金融ニュースやソーシャルメディアから市場センチメントを抽出・分析するシステムを実装します。

## 問題の説明
現在のシステムには以下の課題があります：

1. **センチメント分析の不足**
   - ニュースやソーシャルメディアのセンチメント分析がない
   - 定性的な情報が取引判断に活用されていない
   - 情報のタイムラグが大きい

2. **情報収集の限界**
   - 手動での情報収集に依存
   - 複数のソースからの統合がない
   - リアルタイムの情報取得が不十分

3. **情報の解釈不足**
   - テキストの意味理解が不十分
   - 文脈の考慮がない
   - エンティティの抽出が不十分

## 影響
- 市場イベントへの対応遅れ
- 情報の機会損失
- 感情に基づいた判断のリスク

## 推奨される解決策

### 1. ニュース収集エンジンの実装

```typescript
// app/lib/nlp/NewsCollector.ts
export class NewsCollector {
  private sources: NewsSource[];
  private scraper: WebScraper;
  private apiClients: Map<string, NewsAPIClient>;

  constructor(config: NewsCollectorConfig) {
    this.sources = config.sources;
    this.scraper = new WebScraper(config.scraperConfig);
    this.apiClients = this.initializeAPIClients(config.apiClients);
  }

  // ニュースの収集
  async collectNews(symbols: string[], timeRange: TimeRange): Promise<News[]> {
    const newsPromises = this.sources.map(source =>
      this.collectFromSource(source, symbols, timeRange)
    );

    const newsArrays = await Promise.all(newsPromises);
    return newsArrays.flat();
  }

  // 特定のソースから収集
  private async collectFromSource(
    source: NewsSource,
    symbols: string[],
    timeRange: TimeRange
  ): Promise<News[]> {
    switch (source.type) {
      case 'RSS':
        return this.collectFromRSS(source.url, symbols, timeRange);
      case 'API':
        return this.collectFromAPI(source, symbols, timeRange);
      case 'WEB':
        return this.collectFromWeb(source.url, symbols, timeRange);
      default:
        return [];
    }
  }

  // RSSフィードからの収集
  private async collectFromRSS(
    url: string,
    symbols: string[],
    timeRange: TimeRange
  ): Promise<News[]> {
    const feed = await this.scraper.scrapeRSS(url);
    const filtered = this.filterByTime(feed, timeRange);
    const relevant = this.filterBySymbols(filtered, symbols);

    return relevant.map(item => ({
      id: this.generateId(item),
      title: item.title,
      content: item.content,
      source: url,
      publishedAt: new Date(item.publishedAt),
      symbols: this.extractSymbols(item.content, symbols),
      url: item.url,
      type: 'NEWS',
    }));
  }

  // APIからの収集
  private async collectFromAPI(
    source: NewsSource,
    symbols: string[],
    timeRange: TimeRange
  ): Promise<News[]> {
    const client = this.apiClients.get(source.name);
    if (!client) return [];

    const params = {
      symbols: symbols.join(','),
      from: timeRange.start.toISOString(),
      to: timeRange.end.toISOString(),
    };

    const response = await client.getNews(params);
    return response.data.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: source.name,
      publishedAt: new Date(item.publishedAt),
      symbols: item.symbols,
      url: item.url,
      type: 'NEWS',
    }));
  }

  // リアルタイムニュースの監視
  startRealtimeMonitoring(symbols: string[]): void {
    this.sources.forEach(source => {
      if (source.type === 'RSS') {
        this.monitorRSS(source.url, symbols);
      } else if (source.type === 'API' && source.supportsRealtime) {
        this.monitorAPI(source, symbols);
      }
    });
  }

  private monitorRSS(url: string, symbols: string[]): void {
    setInterval(async () => {
      const news = await this.collectFromRSS(
        url,
        symbols,
        { start: new Date(Date.now() - 60000), end: new Date() }
      );
      if (news.length > 0) {
        this.emit('news:received', news);
      }
    }, 60000); // 1分ごとにチェック
  }
}
```

### 2. センチメント分析エンジンの実装

```typescript
// app/lib/nlp/SentimentAnalyzer.ts
export class SentimentAnalyzer {
  private model: SentimentModel;
  private finbert: FinBERT;
  private vader: VADER;
  private bert: BERT;

  constructor(config: SentimentConfig) {
    this.model = new SentimentModel(config.modelConfig);
    this.finbert = new FinBERT(config.finbertConfig);
    this.vader = new VADER();
    this.bert = new BERT(config.bertConfig);
  }

  // テキストのセンチメント分析
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    // 複数のモデルで分析
    const [finbertResult, vaderResult, bertResult] = await Promise.all([
      this.finbert.analyze(text),
      this.vader.analyze(text),
      this.bert.analyze(text),
    ]);

    // 結果の統合
    const ensembleResult = this.ensembleResults([
      finbertResult,
      vaderResult,
      bertResult,
    ]);

    return {
      sentiment: ensembleResult.sentiment,
      confidence: ensembleResult.confidence,
      scores: {
        positive: ensembleResult.positive,
        negative: ensembleResult.negative,
        neutral: ensembleResult.neutral,
      },
      modelResults: {
        finbert: finbertResult,
        vader: vaderResult,
        bert: bertResult,
      },
      keywords: this.extractKeywords(text),
      entities: this.extractEntities(text),
    };
  }

  // ニュースのセンチメント分析
  async analyzeNewsSentiment(news: News): Promise<NewsSentiment> {
    const titleSentiment = await this.analyzeSentiment(news.title);
    const contentSentiment = await this.analyzeSentiment(news.content);

    // タイトルと本文の重み付け
    const titleWeight = 0.3;
    const contentWeight = 0.7;

    const weightedSentiment = this.weightedAverage(
      titleSentiment,
      contentSentiment,
      titleWeight,
      contentWeight
    );

    return {
      newsId: news.id,
      sentiment: weightedSentiment.sentiment,
      confidence: weightedSentiment.confidence,
      titleSentiment,
      contentSentiment,
      overallSentiment: weightedSentiment,
      timestamp: new Date(),
    };
  }

  // シンボルごとのセンチメント集計
  aggregateSentimentBySymbol(
    newsSentiments: NewsSentiment[]
  ): Map<string, SymbolSentiment> {
    const symbolSentiments = new Map<string, NewsSentiment[]>();

    // シンボルごとにグループ化
    newsSentiments.forEach(ns => {
      const symbols = ns.newsId.split(':')[1].split(',');
      symbols.forEach(symbol => {
        if (!symbolSentiments.has(symbol)) {
          symbolSentiments.set(symbol, []);
        }
        symbolSentiments.get(symbol)!.push(ns);
      });
    });

    // 各シンボルの集計
    const results = new Map<string, SymbolSentiment>();
    symbolSentiments.forEach((sentiments, symbol) => {
      const aggregated = this.aggregateSentiments(sentiments);
      results.set(symbol, {
        symbol,
        ...aggregated,
        newsCount: sentiments.length,
        timestamp: new Date(),
      });
    });

    return results;
  }

  // センチメントの時系列分析
  analyzeSentimentTimeSeries(
    symbol: string,
    timeRange: TimeRange
  ): SentimentTimeSeries {
    const sentiments = this.getSentimentsForSymbol(symbol, timeRange);
    const buckets = this.bucketByTime(sentiments, 3600000); // 1時間ごと

    return {
      symbol,
      timeRange,
      data: buckets.map(bucket => ({
        timestamp: bucket.timestamp,
        sentiment: this.aggregateSentiments(bucket.sentiments),
        newsCount: bucket.sentiments.length,
      })),
      trend: this.calculateTrend(buckets),
      volatility: this.calculateVolatility(buckets),
    };
  }

  // センチメントの変化検知
  detectSentimentChange(
    currentSentiment: SymbolSentiment,
    historicalSentiment: SymbolSentiment[],
    threshold: number = 0.3
  ): SentimentChangeAlert | null {
    const avgHistorical = this.averageSentiment(historicalSentiment);
    const change = currentSentiment.overallSentiment.scores.positive - avgHistorical.scores.positive;

    if (Math.abs(change) > threshold) {
      return {
        type: change > 0 ? 'SENTIMENT_POSITIVE_SHIFT' : 'SENTIMENT_NEGATIVE_SHIFT',
        severity: Math.abs(change) > 0.5 ? 'HIGH' : 'MEDIUM',
        symbol: currentSentiment.symbol,
        change,
        previousSentiment: avgHistorical,
        currentSentiment: currentSentiment.overallSentiment,
        timestamp: new Date(),
      };
    }

    return null;
  }
}
```

### 3. ソーシャルメディア分析エンジンの実装

```typescript
// app/lib/nlp/SocialMediaAnalyzer.ts
export class SocialMediaAnalyzer {
  private twitterClient: TwitterClient;
  private redditClient: RedditClient;
  private stocktwitsClient: StockTwitsClient;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor(config: SocialMediaConfig) {
    this.twitterClient = new TwitterClient(config.twitter);
    this.redditClient = new RedditClient(config.reddit);
    this.stocktwitsClient = new StockTwitsClient(config.stocktwits);
    this.sentimentAnalyzer = new SentimentAnalyzer(config.sentiment);
  }

  // ソーシャルメディアの収集
  async collectSocialMedia(
    symbols: string[],
    timeRange: TimeRange
  ): Promise<SocialMediaPost[]> {
    const [twitterPosts, redditPosts, stocktwitsPosts] = await Promise.all([
      this.twitterClient.search(symbols, timeRange),
      this.redditClient.search(symbols, timeRange),
      this.stocktwitsClient.search(symbols, timeRange),
    ]);

    return [
      ...twitterPosts.map(p => ({ ...p, platform: 'TWITTER' })),
      ...redditPosts.map(p => ({ ...p, platform: 'REDDIT' })),
      ...stocktwitsPosts.map(p => ({ ...p, platform: 'STOCKTWITS' })),
    ];
  }

  // 影響力のある投稿の特定
  identifyInfluentialPosts(
    posts: SocialMediaPost[],
    threshold: number = 1000
  ): InfluentialPost[] {
    return posts
      .filter(post => post.likes + post.shares > threshold)
      .map(post => ({
        ...post,
        influenceScore: this.calculateInfluenceScore(post),
        sentiment: this.sentimentAnalyzer.analyzeSentimentSync(post.content),
      }))
      .sort((a, b) => b.influenceScore - a.influenceScore);
  }

  // バズワードの追跡
  trackBuzzwords(symbols: string[], timeWindow: number = 86400000): BuzzwordAnalysis {
    const posts = this.getRecentPosts(symbols, timeWindow);
    const wordCounts = this.countWords(posts);
    const trendingWords = this.getTrendingWords(wordCounts);

    return {
      symbols,
      timeWindow,
      buzzwords: trendingWords,
      sentimentByWord: this.analyzeSentimentByWord(posts, trendingWords),
      timestamp: new Date(),
    };
  }

  // ソーシャルメディアのセンチメント分析
  async analyzeSocialSentiment(
    symbols: string[],
    timeRange: TimeRange
  ): Promise<SocialSentimentAnalysis> {
    const posts = await this.collectSocialMedia(symbols, timeRange);
    const sentiments = await Promise.all(
      posts.map(post => this.sentimentAnalyzer.analyzeSentiment(post.content))
    );

    // プラットフォームごとの集計
    const byPlatform = this.groupByPlatform(posts, sentiments);

    // シンボルごとの集計
    const bySymbol = this.groupBySymbol(posts, sentiments);

    // 時系列分析
    const timeSeries = this.analyzeTimeSeries(posts, sentiments);

    return {
      symbols,
      timeRange,
      totalPosts: posts.length,
      overallSentiment: this.aggregateSentiments(sentiments),
      byPlatform,
      bySymbol,
      timeSeries,
      influentialPosts: this.identifyInfluentialPosts(posts),
      buzzwords: this.trackBuzzwords(symbols),
    };
  }
}
```

### 4. イベント抽出エンジンの実装

```typescript
// app/lib/nlp/EventExtractor.ts
export class EventExtractor {
  private nerModel: NERModel;
  private relationExtractor: RelationExtractor;
  private eventClassifier: EventClassifier;

  constructor(config: EventExtractionConfig) {
    this.nerModel = new NERModel(config.nerConfig);
    this.relationExtractor = new RelationExtractor(config.relationConfig);
    this.eventClassifier = new EventClassifier(config.classifierConfig);
  }

  // ニュースからのイベント抽出
  async extractEvents(news: News): Promise<ExtractedEvent[]> {
    const entities = await this.nerModel.extractEntities(news.content);
    const relations = await this.relationExtractor.extractRelations(news.content, entities);
    const events = await this.eventClassifier.classifyEvents(news.content, entities, relations);

    return events.map(event => ({
      id: this.generateId(news.id, event.type, event.timestamp),
      type: event.type,
      entities: event.entities,
      relations: event.relations,
      confidence: event.confidence,
      source: news.source,
      timestamp: event.timestamp || news.publishedAt,
      description: event.description,
    }));
  }

  // イベントの分類
  async classifyEvent(text: string): Promise<EventClassification> {
    const classification = await this.eventClassifier.classify(text);

    return {
      eventType: classification.eventType,
      subType: classification.subType,
      confidence: classification.confidence,
      affectedEntities: classification.entities,
      impactLevel: this.assessImpactLevel(classification),
      timeframe: this.estimateTimeframe(classification),
    };
  }

  // イベントの影響分析
  analyzeEventImpact(event: ExtractedEvent, symbol: string): EventImpactAnalysis {
    const historicalEvents = this.getHistoricalEvents(event.type);
    const similarEvents = this.findSimilarEvents(event, historicalEvents);

    // 類似イベントからの価格影響を分析
    const priceImpacts = similarEvents.map(e => this.getPriceImpact(e, symbol));
    const avgPriceImpact = this.average(priceImpacts);
    const volatilityImpact = this.calculateVolatilityImpact(similarEvents, symbol);

    return {
      eventId: event.id,
      eventType: event.type,
      symbol,
      expectedPriceImpact: avgPriceImpact,
      expectedVolatilityImpact: volatilityImpact,
      confidence: this.calculateConfidence(similarEvents),
      timeframe: this.estimateTimeframe(similarEvents),
      similarEvents: similarEvents.slice(0, 5),
      recommendations: this.getRecommendations(avgPriceImpact, volatilityImpact),
    };
  }

  // イベントの相関分析
  correlateEvents(events: ExtractedEvent[]): EventCorrelationAnalysis {
    const correlations: EventCorrelation[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const correlation = this.calculateEventCorrelation(events[i], events[j]);
        if (correlation > 0.5) {
          correlations.push({
            event1: events[i],
            event2: events[j],
            correlation,
            timeDifference: Math.abs(
              events[i].timestamp.getTime() - events[j].timestamp.getTime()
            ),
          });
        }
      }
    }

    return {
      correlations: correlations.sort((a, b) => b.correlation - a.correlation),
      clusters: this.clusterEvents(events, correlations),
    };
  }
}
```

### 5. 統合センチメントダッシュボードの実装

```typescript
// app/lib/nlp/SentimentDashboard.ts
export class SentimentDashboard {
  private newsCollector: NewsCollector;
  private sentimentAnalyzer: SentimentAnalyzer;
  private socialMediaAnalyzer: SocialMediaAnalyzer;
  private eventExtractor: EventExtractor;

  constructor(config: DashboardConfig) {
    this.newsCollector = new NewsCollector(config.newsCollector);
    this.sentimentAnalyzer = new SentimentAnalyzer(config.sentimentAnalyzer);
    this.socialMediaAnalyzer = new SocialMediaAnalyzer(config.socialMediaAnalyzer);
    this.eventExtractor = new EventExtractor(config.eventExtractor);
  }

  // 包括的なセンチメントレポートの生成
  async generateSentimentReport(
    symbols: string[],
    timeRange: TimeRange
  ): Promise<SentimentReport> {
    // ニュースの収集と分析
    const news = await this.newsCollector.collectNews(symbols, timeRange);
    const newsSentiments = await Promise.all(
      news.map(n => this.sentimentAnalyzer.analyzeNewsSentiment(n))
    );

    // ソーシャルメディアの分析
    const socialSentiment = await this.socialMediaAnalyzer.analyzeSocialSentiment(
      symbols,
      timeRange
    );

    // イベントの抽出
    const events = await Promise.all(
      news.map(n => this.eventExtractor.extractEvents(n))
    ).then(e => e.flat());

    // 統合分析
    const integratedSentiment = this.integrateSentiments(
      newsSentiments,
      socialSentiment
    );

    return {
      symbols,
      timeRange,
      news: {
        count: news.length,
        sentiment: this.aggregateSentiments(newsSentiments),
        topNews: this.getTopNews(news, newsSentiments, 10),
      },
      socialMedia: socialSentiment,
      events: {
        count: events.length,
        byType: this.groupEventsByType(events),
        recentEvents: events.slice(0, 10),
      },
      integratedSentiment,
      recommendations: this.generateRecommendations(integratedSentiment, events),
      generatedAt: new Date(),
    };
  }

  // リアルタイムセンチメントの監視
  startRealtimeMonitoring(symbols: string[]): void {
    this.newsCollector.startRealtimeMonitoring(symbols);

    this.newsCollector.on('news:received', async (news: News[]) => {
      const sentiments = await Promise.all(
        news.map(n => this.sentimentAnalyzer.analyzeNewsSentiment(n))
      );

      // センチメント変化の検知
      sentiments.forEach(sentiment => {
        const change = this.sentimentAnalyzer.detectSentimentChange(
          sentiment.overallSentiment,
          this.getHistoricalSentiment(sentiment.newsId)
        );

        if (change) {
          this.emit('sentiment:change', change);
        }
      });
    });
  }
}
```

## 実装計画

1. **フェーズ1: ニュース収集** (2週間)
   - RSSフィードの実装
   - APIクライアントの実装
   - ウェブスクレイピングの実装

2. **フェーズ2: センチメント分析** (2週間)
   - FinBERTの実装
   - VADERの実装
   - アンサンブルの実装

3. **フェーズ3: ソーシャルメディア分析** (2週間)
   - Twitter APIの実装
   - Reddit APIの実装
   - StockTwits APIの実装

4. **フェーズ4: イベント抽出と統合** (2週間)
   - NERモデルの実装
   - イベント分類の実装
   - ダッシュボードの実装

## 成功指標
- センチメント予測精度70%以上
- ニュース収集カバレッジ90%以上
- リアルタイム処理レイテンシ5秒以内
- イベント抽出精度80%以上

## 関連ファイル
- [`trading-platform/app/lib/sentiment/`](trading-platform/app/lib/sentiment/)
- [`trading-platform/app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts`](trading-platform/app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts)

## ラベル
- enhancement
- ml
- nlp
- sentiment-analysis
- priority:high
- area:nlp-analysis
