# NLP-based Sentiment Analysis System

## Overview

This implementation provides a comprehensive Natural Language Processing (NLP) system for analyzing financial news and social media sentiment. The system collects data from multiple sources, processes it using NLP techniques, and provides real-time sentiment insights.

## Architecture

### Core Components

#### 1. NewsCollector (`app/lib/nlp/NewsCollector.ts`)

Aggregates financial news from multiple sources:
- **Alpha Vantage News API** - Primary source for financial news
- **Yahoo Finance** - Additional market news
- **Reuters Business** - RSS feed for business news

**Features:**
- Automatic news collection at configurable intervals
- Deduplication by URL to prevent duplicate articles
- Time-based filtering and cleanup
- Symbol and keyword filtering
- Support for multiple news sources

**Configuration:**
```typescript
const newsCollector = new NewsCollector({
  maxArticlesPerSource: 50,
  deduplicationWindow: 86400000, // 24 hours
  cacheExpiry: 3600000, // 1 hour
  keywords: ['earnings', 'merger', 'acquisition'],
  symbols: ['^N225', '^GSPC', '^IXIC'],
});
```

#### 2. SocialMediaCollector (`app/lib/nlp/SocialMediaCollector.ts`)

Collects social media posts from:
- Twitter (requires API key)
- Reddit (requires API key)
- StockTwits (requires API key)
- Telegram (requires API key)

**Features:**
- Platform-specific collectors
- Engagement-based filtering
- Deduplication by post ID
- Engagement scoring (likes, shares, comments)
- Platform statistics

**Configuration:**
```typescript
const socialCollector = new SocialMediaCollector({
  maxPostsPerSource: 100,
  minimumEngagement: 10,
  deduplicationWindow: 86400000,
  languages: ['en', 'ja'],
});
```

#### 3. NLPProcessor (`app/lib/nlp/NLPProcessor.ts`)

Processes text using NLP techniques:
- **Entity Extraction** - Identifies tickers, organizations, dates, money amounts
- **Topic Classification** - Categorizes content into financial topics
- **Key Phrase Extraction** - Finds important phrases
- **Language Detection** - Detects English and Japanese
- **Text Summarization** - Generates concise summaries
- **Entity Co-occurrence Analysis** - Finds related entities

**Supported Topics:**
- Earnings, Mergers & Acquisitions
- Regulation, Market Movements
- Monetary Policy, Technology
- Energy, Cryptocurrency

#### 4. SentimentAnalysisEngine (`app/lib/sentiment/SentimentAnalysisEngine.ts`)

Already implemented - provides sentiment scoring:
- Dictionary-based sentiment analysis
- Sentiment aggregation across sources
- Trend analysis
- Alert generation for significant changes

#### 5. SentimentIntegrationService (`app/lib/nlp/SentimentIntegrationService.ts`)

Integrates all components into a unified service:
- Manages lifecycle of all collectors and processors
- Coordinates data flow between components
- Provides unified API for sentiment queries
- Handles real-time updates and notifications

## API Endpoints

### GET /api/sentiment

Get sentiment data for all tracked symbols.

**Response:**
```json
{
  "success": true,
  "status": {
    "isRunning": true,
    "newsEnabled": true,
    "socialEnabled": false,
    "nlpEnabled": true,
    "stats": {
      "newsCount": 25,
      "socialCount": 0,
      "trackedSymbols": 3
    }
  },
  "data": {
    "AAPL": { /* sentiment data */ }
  },
  "count": 3
}
```

### GET /api/sentiment/[symbol]

Get sentiment data for a specific symbol.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "overallScore": 0.65,
    "overallMagnitude": 0.78,
    "confidence": 0.82,
    "trend": "improving",
    "volume": 42,
    "newsCount": 28,
    "socialCount": 14,
    "sources": {
      "news": { "score": 0.7, "magnitude": 0.8, "confidence": 0.85, "label": "positive" },
      "social": { "score": 0.6, "magnitude": 0.75, "confidence": 0.78, "label": "positive" },
      "analyst": { "score": 0.5, "magnitude": 0.6, "confidence": 0.7, "label": "positive" }
    },
    "entities": ["Apple", "AAPL", "Tim Cook"],
    "topics": ["earnings", "tech", "market"],
    "trend": {
      "direction": "bullish",
      "strength": 65,
      "momentum": 12,
      "confidence": 0.82
    }
  }
}
```

### POST /api/sentiment

Control sentiment analysis service.

**Request:**
```json
{
  "action": "start" | "stop" | "clear"
}
```

### GET /api/news

Get news articles with optional filtering.

**Query Parameters:**
- `symbol` - Filter by stock symbol
- `keywords` - Comma-separated keywords
- `limit` - Maximum results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "av-20240115-123",
      "title": "Apple Reports Strong Q4 Earnings",
      "content": "Apple Inc. reported...",
      "source": "Reuters",
      "url": "https://...",
      "publishedAt": 1705329600000,
      "symbol": "AAPL",
      "author": "John Doe"
    }
  ],
  "count": 15,
  "total": 42
}
```

## UI Components

### SentimentPanel

React component for displaying sentiment analysis:

**Features:**
- Overall sentiment score with visual indicator
- Source breakdown (news, social, analyst)
- Trend indicator
- Key entities and topics
- Confidence and magnitude metrics
- Auto-refresh every 5 minutes

**Usage:**
```tsx
import { SentimentPanel } from '@/app/components/SentimentPanel';

<SentimentPanel symbol="AAPL" />
```

## Usage Examples

### Starting the Sentiment Analysis System

```typescript
import { getGlobalSentimentIntegration } from '@/app/lib/nlp/SentimentIntegrationService';

const sentimentService = getGlobalSentimentIntegration({
  enableNewsCollection: true,
  enableSocialCollection: false, // Requires API keys
  enableNLPProcessing: true,
});

sentimentService.start();
```

### Getting Market Intelligence

```typescript
// Get sentiment for a specific symbol
const intelligence = sentimentService.getMarketIntelligence('AAPL');

console.log(intelligence.sentiment.overallScore);
console.log(intelligence.topNews);
console.log(intelligence.entities);
```

### Listening to Events

```typescript
sentimentService.on('sentiment_update', (sentiment) => {
  console.log('Sentiment updated:', sentiment);
});

sentimentService.on('alert', (alert) => {
  console.log('Alert:', alert.message);
});

sentimentService.on('significant_sentiment', (sentiment) => {
  console.log('Significant sentiment change detected:', sentiment);
});
```

## Configuration

### Environment Variables

```bash
# Required for news collection
ALPHA_VANTAGE_API_KEY=your_api_key_here

# Optional for social media (not enabled by default)
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
REDDIT_CLIENT_ID=your_id
REDDIT_CLIENT_SECRET=your_secret
STOCKTWITS_ACCESS_TOKEN=your_token
```

### Customizing News Sources

```typescript
import { DEFAULT_NEWS_SOURCES } from '@/app/lib/nlp/NewsCollector';

const customSources = [
  ...DEFAULT_NEWS_SOURCES,
  {
    id: 'custom-source',
    name: 'Custom Financial News',
    type: 'rss',
    url: 'https://custom-news.com/feed',
    enabled: true,
    priority: 8,
    updateInterval: 600000, // 10 minutes
  },
];

const newsCollector = new NewsCollector({
  sources: customSources,
});
```

## Testing

The system includes comprehensive test coverage:

- **NLPProcessor Tests** - 27 tests covering entity extraction, topic classification, etc.
- **NewsCollector Tests** - 26 tests covering collection, deduplication, cleanup
- **SocialMediaCollector Tests** - 13 tests covering platform handling, engagement
- **API Tests** - 7 tests covering endpoints and error handling

Run tests:
```bash
npm test -- app/lib/nlp/__tests__/
npm test -- app/api/sentiment/__tests__/
```

## Performance Considerations

1. **Caching**: Articles and posts are cached with configurable expiry times
2. **Deduplication**: Prevents processing duplicate content
3. **Rate Limiting**: API calls are throttled to prevent excessive requests
4. **Cleanup**: Old data is automatically removed to manage memory
5. **Singleton Pattern**: Services use singletons to prevent multiple instances

## Future Enhancements

1. **Advanced NLP**:
   - Integration with external NLP APIs (Google Cloud NLP, AWS Comprehend)
   - Sentiment analysis for multiple languages
   - Advanced entity extraction with context

2. **Data Sources**:
   - Additional news sources (Bloomberg, Financial Times)
   - More social media platforms
   - Financial forum integration

3. **Analysis**:
   - Historical sentiment tracking
   - Sentiment correlation with price movements
   - Predictive modeling based on sentiment

4. **UI Improvements**:
   - Interactive charts for sentiment trends
   - News article viewer within the platform
   - Real-time alerts in notification center

## Security Considerations

1. **API Keys**: Store securely in environment variables
2. **Rate Limiting**: Implement on API endpoints
3. **Input Validation**: Sanitize all user inputs
4. **Error Handling**: Don't leak sensitive information in errors
5. **HTTPS**: Use secure connections for all external API calls

## Troubleshooting

### No sentiment data available

- Check that sentiment service is started
- Verify ALPHA_VANTAGE_API_KEY is set
- Check console for errors

### News not updating

- Verify news collector is running
- Check API rate limits
- Review news source configurations

### High memory usage

- Reduce `cacheExpiry` time
- Lower `maxArticlesPerSource` and `maxPostsPerSource`
- Increase cleanup frequency

## License

This implementation is part of the ULT Trading Platform and follows the project's licensing terms.
