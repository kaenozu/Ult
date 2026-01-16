---
name: analyze_sentiment
description: Analyze the sentiment of text or news headlines to gauge market mood.
---

# Analyze Sentiment

This skill allows you to perform sentiment analysis on arbitrary text or fetch and analyze recent news headlines for a specific stock ticker. This is useful for understanding market sentiment, detecting positive/negative trends, and evaluating news impact.

## Usage

### Analyze Specific Text
Analyze a single string of text.

```bash
python backend/src/cli/sentiment.py text "Text to analyze"
```

### Analyze News for Ticker
Fetch and analyze news headlines for a stock ticker.

```bash
python backend/src/cli/sentiment.py news <TICKER> [--limit <N>]
```

**Arguments:**
- `<TICKER>`: The stock ticker symbol (e.g., `7203.T`).
- `--limit <N>`: (Optional) Maximum number of articles to analyze (default: 10).

## Output Format (JSON)

### Text Analysis
```json
{
  "sentiment": 0.5,           // -1.0 to 1.0 (Negative to Positive)
  "confidence": 0.8,          // 0.0 to 1.0
  "polarity": "positive",     // "positive", "negative", "neutral"
  "financial_relevance": 0.9, // 0.0 to 1.0
  "tech_relevance": 0.2       // 0.0 to 1.0
}
```

### News Analysis
```json
{
  "ticker": "7203.T",
  "indicators": {
    "sentiment_score": 0.15,
    "polarity_distribution": {
      "positive": 0.4,
      "negative": 0.1,
      "neutral": 0.5
    },
    "trend": "improving",    // "improving", "declining", "stable"
    "volatility": 0.12
  },
  "headlines": [
    {
      "timestamp": "...",
      "title": "...",
      "sentiment": 0.4,
      "source": "..."
    }
  ]
}
```
