# Market Data Source Configuration Guide

## ⚠️ Current Limitations with Yahoo Finance

The current default data source (Yahoo Finance) has significant limitations for real trading:

### Critical Issues

1. **15-Minute Delay**
   - All data is delayed by 15 minutes
   - Not suitable for day trading or scalping
   - Price movements already happened before you see them

2. **No Intraday Data for Japanese Stocks**
   - 1-minute, 5-minute, 15-minute intervals NOT available
   - Only daily data (1d) available for Japanese stocks
   - Falls back silently to daily data

3. **Strict Rate Limits**
   - 5 requests per minute
   - 2,000 requests per day
   - Shared across all users from same IP
   - Frequently hit limits during active trading

4. **Data Quality Issues**
   - Missing values (gaps in data)
   - No adjustment for splits/dividends in some cases
   - Occasional data inconsistencies
   - No validation of data accuracy

5. **No Tick-Level Data**
   - No bid/ask spreads
   - No Level II order book data
   - Volume data only (no individual trades)
   - Cannot calculate slippage accurately

## 🎯 Recommended Alternative Data Sources

### For US Markets

#### 1. IEX Cloud (Recommended for Most Users)
- **Cost**: $9/month for Starter plan
- **Features**:
  - Real-time data (no delay)
  - Intraday intervals (1m, 5m, 15m, etc.)
  - Bid/ask spreads available
  - Good rate limits (100 req/min)
  - Historical data included
- **Best For**: Day trading, swing trading, portfolio management
- **Setup**: https://iexcloud.io/

#### 2. Polygon.io (Best for High-Frequency Trading)
- **Cost**: $29/month for Starter plan
- **Features**:
  - Real-time tick-by-tick data
  - WebSocket streaming
  - Excellent rate limits (200 req/min)
  - Multiple asset classes (stocks, crypto, forex)
  - Historical tick data
- **Best For**: Scalping, algorithmic trading, backtesting
- **Setup**: https://polygon.io/

#### 3. Alpaca (Best Free Option)
- **Cost**: Free tier available
- **Features**:
  - Real-time data for free
  - Good rate limits (200 req/min)
  - US stocks only
  - Great for testing and development
- **Best For**: Learning, testing strategies, budget-conscious traders
- **Setup**: https://alpaca.markets/

### For Japanese Markets

⚠️ **Important**: Japanese stock data requires specialized providers:

1. **Bloomberg Terminal** (Professional)
   - Cost: ~$2,000/month
   - Real-time data with bid/ask
   - Most comprehensive but expensive

2. **Refinitiv (formerly Reuters)**
   - Cost: Custom pricing
   - Real-time Japanese market data
   - Professional-grade reliability

3. **Tokyo Stock Exchange Data Feed**
   - Direct from TSE
   - Real-time tick data
   - Requires exchange membership

4. **Kabu.com API** (Japanese broker)
   - Free with account
   - Real-time data for account holders
   - Limited to Japanese stocks

## 🔧 Configuration

### Step 1: Get API Keys

Choose one or more data sources and sign up for API keys:

1. **IEX Cloud**: https://iexcloud.io/console/
2. **Polygon.io**: https://polygon.io/dashboard/api-keys
3. **Alpaca**: https://app.alpaca.markets/paper/dashboard/overview

### Step 2: Configure Environment Variables

Add your API keys to `.env.local`:

```bash
# IEX Cloud
IEX_CLOUD_API_KEY=pk_your_key_here

# Polygon.io
POLYGON_API_KEY=your_key_here

# Alpaca
ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here

# Data source priority (comma-separated)
DATA_SOURCE_PRIORITY=polygon,iex_cloud,yahoo_finance
```

### Step 3: Restart Development Server

```bash
npm run dev
```

The system will automatically:
- Detect available data sources
- Use the best source based on priority
- Fall back to Yahoo Finance if others fail
- Display warnings if using suboptimal sources

## 📊 Data Source Comparison

| Feature | Yahoo Finance | IEX Cloud | Polygon.io | Alpaca |
|---------|---------------|-----------|------------|--------|
| **Cost** | Free | $9/mo | $29/mo | Free |
| **Realtime** | ❌ (15min delay) | ✅ | ✅ | ✅ |
| **Intraday** | ⚠️ (US only) | ✅ | ✅ | ✅ |
| **Japanese Stocks** | ⚠️ (Daily only) | ❌ | ❌ | ❌ |
| **Bid/Ask** | ❌ | ✅ | ✅ | ✅ |
| **Tick Data** | ❌ | ❌ | ✅ | ❌ |
| **Rate Limit** | 5/min | 100/min | 200/min | 200/min |
| **Quality** | Fair | Good | Excellent | Good |

## 🎮 Usage Examples

### Automatic Selection

The system automatically selects the best data source:

```typescript
// No changes needed - system picks best source
const data = await fetch('/api/market?type=history&symbol=AAPL&interval=1m');
```

### Check Current Data Source

Response includes metadata:

```json
{
  "data": [...],
  "metadata": {
    "source": "polygon",
    "isRealtime": true,
    "delayMinutes": 0,
    "quality": "excellent"
  },
  "warnings": []
}
```

### Data Quality Warnings

System displays warnings when using suboptimal sources:

```json
{
  "warnings": [
    "⚠️ Yahoo Finance使用中: 15分遅延データです",
    "💡 推奨: IEX Cloud、Polygon.io、またはAlpacaの使用を検討してください"
  ]
}
```

## 🔍 Monitoring Data Quality

### In Development Console

Check data source health:

```bash
# View current configuration
curl http://localhost:3000/api/market/health

# Check data quality for symbol
curl "http://localhost:3000/api/market?type=history&symbol=AAPL&interval=1m" | jq '.metadata'
```

### In Application Logs

Look for warnings:
- `[WARN] Using Yahoo Finance - 15min delay`
- `[WARN] No bid/ask data available`
- `[WARN] Intraday data unavailable for Japanese stocks`

## 🚨 Trading Recommendations

### ❌ NOT Suitable with Yahoo Finance:
- Day trading
- Scalping
- High-frequency trading
- Intra-day momentum strategies
- Strategies requiring precise entry/exit timing

### ✅ Acceptable with Yahoo Finance:
- Long-term investing (weeks/months)
- End-of-day strategies
- Swing trading (with caution)
- Backtesting (historical analysis)

### ✅ Requires Real-Time Data:
- Day trading (1-minute to 1-hour charts)
- Scalping (tick data)
- Algorithmic trading
- Stop-loss management
- Risk management with live positions

## 💰 Cost-Benefit Analysis

### Hobby Trader ($0-50/month)
- **Recommendation**: Alpaca (free) or IEX Cloud ($9/mo)
- **Use Case**: Learning, testing, small account
- **Limitation**: US stocks only

### Active Day Trader ($50-200/month)
- **Recommendation**: Polygon.io ($29-99/mo)
- **Use Case**: Active trading, multiple strategies
- **Benefit**: Tick data, high rate limits, WebSocket

### Professional Trader ($200+/month)
- **Recommendation**: Bloomberg/Refinitiv
- **Use Case**: Professional trading, Japanese stocks
- **Benefit**: Highest quality, all markets, real-time

## 🔄 Migration Guide

### From Yahoo Finance to IEX Cloud

1. Sign up: https://iexcloud.io/
2. Get API key
3. Add to `.env.local`: `IEX_CLOUD_API_KEY=pk_...`
4. Restart server
5. Verify: Check response metadata shows `"source": "iex_cloud"`

### From Yahoo Finance to Polygon.io

1. Sign up: https://polygon.io/
2. Get API key
3. Add to `.env.local`: `POLYGON_API_KEY=...`
4. Set priority: `DATA_SOURCE_PRIORITY=polygon,yahoo_finance`
5. Restart server

## 📝 Notes

- Data source selection is automatic based on availability and priority
- Yahoo Finance remains as fallback if paid sources fail
- Monitor your API usage to avoid overage charges
- Consider caching strategies to reduce API calls
- Test thoroughly before live trading with real money

## 🆘 Support

If you need help:
1. Check the warnings in API responses
2. Review server logs for data source issues
3. Verify API keys are correctly configured
4. Check rate limit status in metadata
5. Open an issue on GitHub with data source logs

## 📚 Further Reading

- [IEX Cloud Documentation](https://iexcloud.io/docs/)
- [Polygon.io API Reference](https://polygon.io/docs/)
- [Alpaca Data API](https://alpaca.markets/docs/api-references/market-data-api/)
- [Data Quality Best Practices](../quality/README.md)
