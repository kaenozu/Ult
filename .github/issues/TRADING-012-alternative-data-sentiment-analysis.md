# TRADING-012: 代替データ統合によるセンチメント分析の強化

## 概要
市場価格データ以外の代替データ（Alternative Data）を統合し、より包括的なセンチメント分析システムを構築します。

## 問題の説明
現在のシステムには以下の課題があります：

1. **データソースの限界**
   - 価格データと基本的なテクニカル指標のみに依存
   - 代替データの活用がない
   - データの多様性が不足

2. **センチメントの不十分な把握**
   - 市場参加者の感情を十分に把握できない
   - 機関投資家と個人投資家のセンチメントの差異を考慮していない
   - センチメントの先行指標性を活用していない

3. **データ統合の不足**
   - 複数のデータソースの統合がない
   - データの重み付けが不適切
   - データの品質管理が不十分

## 影響
- 市場の変化への対応遅れ
- 機会損失の増大
- 不完全な市場分析

## 推奨される解決策

### 1. 代替データ収集エンジンの実装

```typescript
// app/lib/alternativeData/DataCollector.ts
export class AlternativeDataCollector {
  private sources: Map<string, DataSource>;
  private cache: DataCache;
  private qualityChecker: DataQualityChecker;

  constructor(config: DataCollectorConfig) {
    this.sources = this.initializeSources(config.sources);
    this.cache = new DataCache(config.cacheConfig);
    this.qualityChecker = new DataQualityChecker(config.qualityConfig);
  }

  // 複数のデータソースから収集
  async collectData(
    symbols: string[],
    timeRange: TimeRange
  ): Promise<AlternativeData[]> {
    const dataPromises = Array.from(this.sources.values()).map(source =>
      this.collectFromSource(source, symbols, timeRange)
    );

    const dataArrays = await Promise.all(dataPromises);
    return dataArrays.flat();
  }

  // 特定のソースから収集
  private async collectFromSource(
    source: DataSource,
    symbols: string[],
    timeRange: TimeRange
  ): Promise<AlternativeData[]> {
    try {
      const rawData = await source.fetch(symbols, timeRange);
      
      // データ品質チェック
      const qualityReport = this.qualityChecker.check(rawData);
      if (!qualityReport.isValid) {
        this.logQualityIssue(source.name, qualityReport);
        return [];
      }

      // データの正規化
      const normalizedData = this.normalizeData(rawData, source.type);

      // キャッシュに保存
      this.cache.store(normalizedData);

      return normalizedData;
    } catch (error) {
      this.handleError(source.name, error);
      return [];
    }
  }

  // 機関投資家フローデータの収集
  async collectInstitutionalFlow(
    symbols: string[],
    timeRange: TimeRange
  ): Promise<InstitutionalFlow[]> {
    const source = this.sources.get('13F') || this.sources.get('SEC');
    if (!source) return [];

    const data = await this.collectFromSource(source, symbols, timeRange);
    return data.map(d => ({
      ...d,
      type: 'INSTITUTIONAL_FLOW',
      source: '13F',
    }));
  }

  // オプションデータの収集
  async collectOptionsData(
    symbols: string[],
    timeRange: TimeRange
  ): Promise<OptionsData[]> {
    const source = this.sources.get('OPTIONS');
    if (!source) return [];

    const data = await this.collectFromSource(source, symbols, timeRange);
    return data.map(d => ({
      ...d,
      type: 'OPTIONS',
      source: 'OPTIONS_CHAIN',
    }));
  }

  // ショートインタレストデータの収集
  async collectShortInterest(
    symbols: string[],
    timeRange: TimeRange
  ): Promise<ShortInterest[]> {
    const source = this.sources.get('SHORT_INTEREST');
    if (!source) return [];

    const data = await this.collectFromSource(source, symbols, timeRange);
    return data.map(d => ({
      ...d,
      type: 'SHORT_INTEREST',
      source: 'SHORT_INTEREST',
    }));
  }
}
```

### 2. センチメント集計エンジンの実装

```typescript
// app/lib/alternativeData/SentimentAggregator.ts
export class SentimentAggregator {
  private dataCollector: AlternativeDataCollector;
  private sentimentAnalyzer: SentimentAnalyzer;
  private weightCalculator: WeightCalculator;

  constructor(config: AggregatorConfig) {
    this.dataCollector = new AlternativeDataCollector(config.collectorConfig);
    this.sentimentAnalyzer = new SentimentAnalyzer(config.sentimentConfig);
    this.weightCalculator = new WeightCalculator(config.weightConfig);
  }

  // 包括的なセンチメントスコアの計算
  async calculateAggregateSentiment(
    symbol: string,
    timeRange: TimeRange
  ): Promise<AggregateSentiment> {
    // 代替データの収集
    const altData = await this.dataCollector.collectData([symbol], timeRange);

    // 各データソースのセンチメントを計算
    const sentiments = await this.calculateSentiments(altData);

    // 重みの計算
    const weights = this.weightCalculator.calculateWeights(sentiments);

    // 加重平均による集計
    const aggregate = this.weightedAverage(sentiments, weights);

    return {
      symbol,
      timeRange,
      aggregateScore: aggregate.score,
      confidence: aggregate.confidence,
      breakdown: this.getBreakdown(sentiments, weights),
      trend: this.calculateTrend(sentiments),
      timestamp: new Date(),
    };
  }

  // 各データソースのセンチメント計算
  private async calculateSentiments(
    data: AlternativeData[]
  ): Promise<SourceSentiment[]> {
    const sentiments: SourceSentiment[] = [];

    // 機関投資家フロー
    const institutionalFlow = data.filter(d => d.type === 'INSTITUTIONAL_FLOW');
    if (institutionalFlow.length > 0) {
      sentiments.push({
        source: 'INSTITUTIONAL_FLOW',
        score: this.calculateInstitutionalFlowSentiment(institutionalFlow),
        confidence: this.calculateConfidence(institutionalFlow),
        data: institutionalFlow,
      });
    }

    // オプションデータ
    const optionsData = data.filter(d => d.type === 'OPTIONS');
    if (optionsData.length > 0) {
      sentiments.push({
        source: 'OPTIONS',
        score: this.calculateOptionsSentiment(optionsData),
        confidence: this.calculateConfidence(optionsData),
        data: optionsData,
      });
    }

    // ショートインタレスト
    const shortInterest = data.filter(d => d.type === 'SHORT_INTEREST');
    if (shortInterest.length > 0) {
      sentiments.push({
        source: 'SHORT_INTEREST',
        score: this.calculateShortInterestSentiment(shortInterest),
        confidence: this.calculateConfidence(shortInterest),
        data: shortInterest,
      });
    }

    // ソーシャルメディア
    const socialMedia = data.filter(d => d.type === 'SOCIAL_MEDIA');
    if (socialMedia.length > 0) {
      const sentiment = await this.sentimentAnalyzer.analyzeSentiment(
        socialMedia.map(d => d.content).join(' ')
      );
      sentiments.push({
        source: 'SOCIAL_MEDIA',
        score: sentiment.scores.positive - sentiment.scores.negative,
        confidence: sentiment.confidence,
        data: socialMedia,
      });
    }

    return sentiments;
  }

  // 機関投資家フローのセンチメント計算
  private calculateInstitutionalFlowSentiment(data: InstitutionalFlow[]): number {
    const netFlow = data.reduce((sum, d) => sum + d.netChange, 0);
    const totalFlow = data.reduce((sum, d) => sum + Math.abs(d.netChange), 0);

    if (totalFlow === 0) return 0;
    return netFlow / totalFlow;
  }

  // オプションデータのセンチメント計算
  private calculateOptionsSentiment(data: OptionsData[]): number {
    const putCallRatio = this.calculatePutCallRatio(data);
    const impliedVolatility = this.calculateAverageIV(data);
    const openInterestChange = this.calculateOpenInterestChange(data);

    // プット/コール比率が低いほどブル、高いほどベア
    const putCallScore = (1 - Math.min(putCallRatio, 2) / 2) * 2 - 1;
    
    // IVが高いほど不安、低いほど安定
    const ivScore = (1 - Math.min(impliedVolatility, 50) / 50) * 2 - 1;
    
    // OIの増加はポジティブ
    const oiScore = Math.min(openInterestChange, 1);

    return (putCallScore * 0.5 + ivScore * 0.3 + oiScore * 0.2);
  }

  // ショートインタレストのセンチメント計算
  private calculateShortInterestSentiment(data: ShortInterest[]): number {
    const avgShortInterest = data.reduce((sum, d) => sum + d.shortInterest, 0) / data.length;
    
    // ショート比率が高いほどネガティブ
    return (1 - Math.min(avgShortInterest, 30) / 30) * 2 - 1;
  }

  // センチメントのトレンド分析
  calculateTrend(sentiments: SourceSentiment[]): SentimentTrend {
    const sorted = sentiments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const scores = sorted.map(s => s.score);

    const trend = this.calculateLinearTrend(scores);
    const momentum = this.calculateMomentum(scores);
    const volatility = this.calculateVolatility(scores);

    return {
      direction: trend > 0.01 ? 'BULLISH' : trend < -0.01 ? 'BEARISH' : 'NEUTRAL',
      strength: Math.abs(trend),
      momentum,
      volatility,
      confidence: this.calculateTrendConfidence(scores),
    };
  }
}
```

### 3. 先行指標分析エンジンの実装

```typescript
// app/lib/alternativeData/LeadingIndicatorAnalyzer.ts
export class LeadingIndicatorAnalyzer {
  private dataCollector: AlternativeDataCollector;
  private correlationAnalyzer: CorrelationAnalyzer;

  constructor(config: AnalyzerConfig) {
    this.dataCollector = new AlternativeDataCollector(config.collectorConfig);
    this.correlationAnalyzer = new CorrelationAnalyzer(config.correlationConfig);
  }

  // 先行指標の特定
  async identifyLeadingIndicators(
    symbol: string,
    lookbackPeriod: number = 252
  ): Promise<LeadingIndicator[]> {
    const priceData = await this.getPriceData(symbol, lookbackPeriod);
    const altData = await this.dataCollector.collectData([symbol], {
      start: new Date(Date.now() - lookbackPeriod * 86400000),
      end: new Date(),
    });

    const indicators: LeadingIndicator[] = [];

    // 各データソースの先行性を分析
    for (const source of this.getUniqueSources(altData)) {
      const sourceData = altData.filter(d => d.source === source);
      const lag = this.calculateLag(priceData, sourceData);
      const correlation = this.correlationAnalyzer.calculateCorrelation(
        priceData,
        sourceData,
        lag
      );

      if (Math.abs(correlation) > 0.5 && lag > 0) {
        indicators.push({
          source,
          lag,
          correlation,
          direction: correlation > 0 ? 'SAME' : 'OPPOSITE',
          confidence: this.calculateConfidence(correlation, sourceData.length),
        });
      }
    }

    return indicators.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  // 先行指標に基づく予測
  async predictFromLeadingIndicators(
    symbol: string,
    horizon: number = 5
  ): Promise<LeadingIndicatorPrediction> {
    const indicators = await this.identifyLeadingIndicators(symbol);
    const currentAltData = await this.dataCollector.collectData([symbol], {
      start: new Date(Date.now() - 86400000),
      end: new Date(),
    });

    const predictions: IndicatorPrediction[] = [];

    for (const indicator of indicators) {
      const sourceData = currentAltData.filter(d => d.source === indicator.source);
      const prediction = this.predictFromIndicator(sourceData, indicator, horizon);
      predictions.push(prediction);
    }

    // 予測の統合
    const aggregate = this.aggregatePredictions(predictions);

    return {
      symbol,
      horizon,
      aggregatePrediction: aggregate,
      individualPredictions: predictions,
      confidence: this.calculateAggregateConfidence(predictions),
      timestamp: new Date(),
    };
  }

  // 特定の指標からの予測
  private predictFromIndicator(
    data: AlternativeData[],
    indicator: LeadingIndicator,
    horizon: number
  ): IndicatorPrediction {
    const sentiment = this.calculateSentiment(data);
    const expectedMove = this.calculateExpectedMove(sentiment, indicator);

    return {
      source: indicator.source,
      lag: indicator.lag,
      sentiment,
      expectedPriceChange: expectedMove,
      confidence: indicator.confidence,
      timeframe: horizon,
    };
  }

  // 極端なセンチメントの検知
  detectExtremeSentiment(
    symbol: string,
    threshold: number = 2
  ): ExtremeSentimentAlert | null {
    const aggregate = await this.sentimentAggregator.calculateAggregateSentiment(
      symbol,
      { start: new Date(Date.now() - 86400000), end: new Date() }
    );

    const zScore = this.calculateZScore(
      aggregate.aggregateScore,
      this.getHistoricalScores(symbol)
    );

    if (Math.abs(zScore) > threshold) {
      return {
        type: zScore > 0 ? 'EXTREME_BULLISH' : 'EXTREME_BEARISH',
        severity: Math.abs(zScore) > 3 ? 'CRITICAL' : 'HIGH',
        symbol,
        currentScore: aggregate.aggregateScore,
        zScore,
        historicalMean: this.getHistoricalMean(symbol),
        recommendedAction: this.getRecommendedAction(zScore),
        timestamp: new Date(),
      };
    }

    return null;
  }
}
```

### 4. センチメント divergenceの検知

```typescript
// app/lib/alternativeData/DivergenceDetector.ts
export class DivergenceDetector {
  private sentimentAggregator: SentimentAggregator;
  private priceAnalyzer: PriceAnalyzer;

  constructor(config: DivergenceConfig) {
    this.sentimentAggregator = new SentimentAggregator(config.aggregatorConfig);
    this.priceAnalyzer = new PriceAnalyzer(config.priceConfig);
  }

  // センチメントと価格の乖離検知
  async detectDivergence(
    symbol: string,
    timeRange: TimeRange
  ): Promise<DivergenceAlert | null> {
    // センチメントの取得
    const sentiment = await this.sentimentAggregator.calculateAggregateSentiment(
      symbol,
      timeRange
    );

    // 価格トレンドの取得
    const priceTrend = await this.priceAnalyzer.analyzeTrend(symbol, timeRange);

    // 乖離の計算
    const divergence = this.calculateDivergence(sentiment, priceTrend);

    if (Math.abs(divergence) > this.config.divergenceThreshold) {
      return {
        type: divergence > 0 ? 'SENTIMENT_ABOVE_PRICE' : 'SENTIMENT_BELOW_PRICE',
        severity: Math.abs(divergence) > this.config.criticalThreshold ? 'HIGH' : 'MEDIUM',
        symbol,
        sentimentScore: sentiment.aggregateScore,
        priceTrend: priceTrend.direction,
        divergence,
        sentimentTrend: sentiment.trend,
        priceTrendStrength: priceTrend.strength,
        recommendedAction: this.getRecommendedAction(divergence, sentiment, priceTrend),
        timestamp: new Date(),
      };
    }

    return null;
  }

  // 複数のデータソース間の乖離検知
  async detectCrossSourceDivergence(
    symbol: string,
    timeRange: TimeRange
  ): Promise<CrossSourceDivergence[]> {
    const altData = await this.dataCollector.collectData([symbol], timeRange);
    const sentiments = await this.calculateSentiments(altData);

    const divergences: CrossSourceDivergence[] = [];

    for (let i = 0; i < sentiments.length; i++) {
      for (let j = i + 1; j < sentiments.length; j++) {
        const divergence = Math.abs(sentiments[i].score - sentiments[j].score);

        if (divergence > this.config.crossSourceThreshold) {
          divergences.push({
            source1: sentiments[i].source,
            source2: sentiments[j].source,
            score1: sentiments[i].score,
            score2: sentiments[j].score,
            divergence,
            timestamp: new Date(),
          });
        }
      }
    }

    return divergences.sort((a, b) => b.divergence - a.divergence);
  }
}
```

## 実装計画

1. **フェーズ1: データ収集** (2週間)
   - 各データソースのAPI実装
   - データ品質チェックの実装
   - キャッシュシステムの実装

2. **フェーズ2: センチメント集計** (2週間)
   - 各データソースのセンチメント計算
   - 重み付けアルゴリズムの実装
   - 集計ロジックの実装

3. **フェーズ3: 先行指標分析** (2週間)
   - ラグ計算の実装
   - 相関分析の実装
   - 予測モデルの実装

4. **フェーズ4: 乖離検知と統合** (2週間)
   - 乖離検知の実装
   - アラートシステムの実装
   - ダッシュボードの実装

## 成功指標
- センチメント予測精度65%以上
- 乖離検知率80%以上
- データ収集カバレッジ95%以上
- リアルタイム処理レイテンシ3秒以内

## 関連ファイル
- [`trading-platform/app/lib/sentiment/`](trading-platform/app/lib/sentiment/)
- [`trading-platform/app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts`](trading-platform/app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts)
- [`trading-platform/app/lib/marketCorrelation.ts`](trading-platform/app/lib/marketCorrelation.ts)

## ラベル
- enhancement
- alternative-data
- sentiment-analysis
- priority:high
- area:alternative-data
