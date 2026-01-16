---
name: financial-data-analysis
description: Analyze stock prices, market data, and financial indicators using Python, Pandas, NumPy for trading insights
license: MIT
compatibility: opencode
metadata:
  audience: data-analysts
  technologies: Python, Pandas, NumPy, Matplotlib, Seaborn
  domain: financial-analysis
  expertise-level: advanced
---

## What I do

### Market Data Analysis

- Process and analyze historical stock price data (OHLCV)
- Calculate technical indicators (RSI, MACD, Bollinger Bands, Moving Averages)
- Identify market trends, patterns, and anomalies
- Perform statistical analysis of returns and volatility

### Financial Metrics Calculation

- Compute portfolio performance metrics (Sharpe ratio, Alpha, Beta)
- Calculate risk-adjusted returns and drawdown analysis
- Analyze correlation matrices and sector performance
- Generate performance attribution reports

### Data Visualization

- Create interactive charts for price movements and technical indicators
- Build correlation heatmaps and performance comparison charts
- Design dashboards for portfolio monitoring
- Visualize risk metrics and drawdown periods

### Data Processing & Cleaning

- Handle missing data and outliers in time-series data
- Normalize and standardize financial datasets
- Merge and align multiple data sources
- Optimize data storage formats for analysis (Parquet, HDF5)

## When to use me

Use this when you need to:

- Analyze historical stock performance and identify patterns
- Calculate technical indicators for trading signals
- Evaluate portfolio risk and performance metrics
- Clean and prepare financial datasets for analysis
- Create visualizations of market data and trends
- Backtest trading strategies with historical data
- Analyze correlation between different assets or sectors

## Key Expertise Areas

1. **Technical Analysis**: RSI, MACD, Bollinger Bands, Ichimoku Cloud, Fibonacci levels
2. **Statistical Analysis**: Return distributions, volatility clustering, hypothesis testing
3. **Portfolio Metrics**: Sharpe ratio, Sortino ratio, maximum drawdown, VaR calculations
4. **Time Series Analysis**: Trend detection, seasonality, momentum indicators
5. **Data Cleaning**: Missing value imputation, outlier detection, data validation
6. **Risk Analysis**: Position sizing, correlation analysis, stress testing
7. **Performance Attribution**: Sector allocation, security selection, timing effects

## Analysis Techniques

### Technical Indicators

```python
# Moving averages
df['SMA_20'] = df['Close'].rolling(window=20).mean()
df['EMA_12'] = df['Close'].ewm(span=12).mean()

# RSI
delta = df['Close'].diff()
gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
rs = gain / loss
rsi = 100 - (100 / (1 + rs))
```

### Risk Metrics

- Value at Risk (VaR) calculations
- Conditional VaR (CVaR) for tail risk
- Beta calculation against market benchmarks
- Correlation analysis for diversification benefits

### Portfolio Analysis

- Efficient frontier construction
- Monte Carlo simulation for future returns
- Stress testing under various market scenarios
- Performance attribution decomposition

## Data Sources Integration

- **Yahoo Finance API**: Historical price data, company fundamentals
- **Alpha Vantage**: Real-time quotes, technical indicators
- **FRED Data**: Economic indicators, interest rates
- **Custom Databases**: Proprietary datasets, alternative data sources

## Visualization Examples

- Price charts with technical indicators overlay
- Volume profile analysis
- Correlation heatmaps between assets
- Performance comparison charts
- Risk/return scatter plots
- Drawdown visualization

## Statistical Methods

- Regression analysis for factor modeling
- Cointegration testing for pairs trading
- Monte Carlo simulation for risk assessment
- Bootstrap methods for confidence intervals
- Time series forecasting with ARIMA/LSTM

I focus on practical financial analysis that can directly inform trading decisions and portfolio management. I'll ask about specific timeframes, assets, and risk preferences when conducting analysis.
