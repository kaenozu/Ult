# Japanese Market Data Enhancement - Future Roadmap

## Current Implementation

The current implementation provides:
1. **Graceful Degradation**: Automatic fallback from intraday to daily data for Japanese stocks
2. **UI Indicators**: Visual badges showing data delay (20 minutes) and fallback status
3. **Clear User Communication**: Tooltips and warnings explaining limitations

## Future Enhancement: Real-time Data via playwright_scraper

### Overview

To overcome the limitations of yahoo-finance2 for Japanese intraday data, we can integrate the existing `playwright_scraper` to fetch real-time bid/ask prices from Yahoo Finance Japan.

### Integration Strategy

#### 1. Data Source Selection
- **Primary**: yahoo-finance2 for daily/weekly data (reliable, free, no scraping)
- **Secondary**: playwright_scraper for real-time quotes (when yahoo-finance2 intraday is unavailable)

#### 2. Architecture

```
┌─────────────────────────────────────────────────┐
│         Frontend (Next.js)                      │
│  - Chart displays data with delay badge         │
│  - Polls /api/market/realtime for updates       │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│    API Route: /api/market/realtime              │
│  - Checks if Japanese stock                     │
│  - Delegates to RealTimeDataService             │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│    RealTimeDataService (Node.js)                │
│  - Manages scraper lifecycle                    │
│  - Caches results (10-20 second TTL)            │
│  - Rate limits (avoid ban)                      │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│    playwright_scraper (Python)                  │
│  - Scrapes Yahoo Finance Japan                  │
│  - Extracts current price, bid/ask              │
│  - Returns JSON                                 │
└─────────────────────────────────────────────────┘
```

#### 3. Implementation Steps

##### Phase 1: Scraper Adaptation (Python)
```bash
cd /home/runner/work/Ult/Ult/playwright_scraper
```

1. Create `yahoo_japan_scraper.py`:
```python
from scraper import PlaywrightScraper, ScrapingConfig
import asyncio
import json

async def fetch_japanese_stock_quote(symbol: str):
    """
    Fetch real-time quote from Yahoo Finance Japan
    Example: https://finance.yahoo.co.jp/quote/7203.T
    """
    config = ScrapingConfig(
        url=f"https://finance.yahoo.co.jp/quote/{symbol}.T",
        headless=True,
        item_selector=".stoksPrice",  # Price element
        max_pages=1,
        output_dir="./output"
    )
    
    async with PlaywrightScraper(config) as scraper:
        # Navigate to page
        await scraper.page.goto(config.url)
        
        # Extract price
        price_element = await scraper.page.query_selector(".stoksPrice")
        price = await price_element.inner_text() if price_element else None
        
        # Extract bid/ask if available
        bid_element = await scraper.page.query_selector(".bid-price")
        ask_element = await scraper.page.query_selector(".ask-price")
        
        return {
            "symbol": symbol,
            "price": float(price.replace(",", "")) if price else None,
            "bid": float(await bid_element.inner_text()) if bid_element else None,
            "ask": float(await ask_element.inner_text()) if ask_element else None,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    result = asyncio.run(fetch_japanese_stock_quote("7203"))
    print(json.dumps(result, indent=2))
```

##### Phase 2: Node.js Service (TypeScript)
```typescript
// trading-platform/app/lib/services/RealTimeDataService.ts

import { spawn } from 'child_process';
import path from 'path';

interface RealTimeQuote {
  symbol: string;
  price: number | null;
  bid: number | null;
  ask: number | null;
  timestamp: string;
}

class RealTimeDataService {
  private cache = new Map<string, { data: RealTimeQuote; expiry: number }>();
  private cacheDuration = 15 * 1000; // 15 seconds
  private scraperPath = path.join(process.cwd(), '..', 'playwright_scraper', 'yahoo_japan_scraper.py');

  async fetchQuote(symbol: string): Promise<RealTimeQuote | null> {
    // Check cache
    const cached = this.cache.get(symbol);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // Run Python scraper
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.scraperPath, symbol]);
      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            // Cache result
            this.cache.set(symbol, {
              data: result,
              expiry: Date.now() + this.cacheDuration
            });
            resolve(result);
          } catch (e) {
            reject(new Error('Failed to parse scraper output'));
          }
        } else {
          reject(new Error(`Scraper failed: ${error}`));
        }
      });
    });
  }
}

export const realTimeDataService = new RealTimeDataService();
```

##### Phase 3: API Route
```typescript
// trading-platform/app/api/market/realtime/route.ts

import { NextResponse } from 'next/server';
import { realTimeDataService } from '@/app/lib/services/RealTimeDataService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const market = searchParams.get('market');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // Only use scraper for Japanese stocks
  if (market !== 'japan') {
    return NextResponse.json({ error: 'Real-time scraping only for Japanese market' }, { status: 400 });
  }

  try {
    const quote = await realTimeDataService.fetchQuote(symbol);
    
    if (!quote) {
      return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: quote,
      source: 'scraper',
      note: 'Real-time data from Yahoo Finance Japan (15-20 min delay)'
    });
  } catch (error) {
    console.error('Real-time fetch error:', error);
    return NextResponse.json({ error: 'Scraper error' }, { status: 500 });
  }
}
```

##### Phase 4: Frontend Integration
```typescript
// Update useStockData.ts to poll real-time data

useEffect(() => {
  if (!selectedStock || selectedStock.market !== 'japan') return;

  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/market/realtime?symbol=${selectedStock.symbol}&market=japan`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Update chart with new price point
        updateChartWithRealTimeData(result.data);
      }
    } catch (error) {
      console.warn('Real-time polling failed:', error);
    }
  }, 20000); // Poll every 20 seconds

  return () => clearInterval(pollInterval);
}, [selectedStock]);
```

### Considerations

#### 1. Legal & Ethical
- ✅ Respect robots.txt
- ✅ Implement rate limiting (1 request per 15-20 seconds per symbol)
- ✅ User-Agent rotation
- ✅ Clear attribution in UI ("Data from Yahoo Finance Japan")

#### 2. Technical
- ✅ Error handling for scraper failures
- ✅ Fallback to daily data if scraping fails
- ✅ Monitoring and alerts for scraper health
- ✅ Chromium resource management (headless mode, process limits)

#### 3. Performance
- ✅ Cache aggressively (15-20 second TTL)
- ✅ Background job queue (avoid blocking UI)
- ✅ Batch requests when possible
- ✅ Circuit breaker pattern for scraper failures

#### 4. Cost
- ✅ Playwright browsers consume memory (~100MB per instance)
- ✅ Consider serverless limits (AWS Lambda max 15 min, memory limits)
- ✅ Alternative: Self-hosted scraper service on dedicated instance

### Testing Plan

1. **Unit Tests**: Test scraper with mock HTML
2. **Integration Tests**: End-to-end API → Scraper → Response
3. **Load Tests**: Simulate multiple users polling real-time data
4. **Failure Tests**: Handle network errors, parsing errors, timeout

### Rollout Strategy

1. **Week 1**: Implement scraper prototype, test on staging
2. **Week 2**: Add API routes, integrate with frontend
3. **Week 3**: A/B test with 10% of users
4. **Week 4**: Full rollout with monitoring

### Alternative: Paid Data Providers

If scraping proves unreliable, consider:
- **Kabu.com API** (Japanese broker API)
- **Alpha Vantage** (Limited Japanese stock support)
- **Polygon.io** (Real-time data, paid)

### Conclusion

The current implementation provides a solid foundation with graceful degradation. The playwright_scraper integration is a natural next step to provide true real-time data for Japanese stocks, but should be implemented carefully with proper rate limiting, caching, and monitoring.

**Priority**: Medium (Current solution is acceptable for swing trading)
**Effort**: High (2-4 weeks of development + testing)
**Risk**: Medium (Scraping reliability, legal considerations)
