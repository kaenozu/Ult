---
name: algorithmic-trading-strategies
description: Design and implement automated trading strategies with Python, technical indicators, risk management, and execution logic
license: MIT
compatibility: opencode
metadata:
  audience: quantitative-developers
  technologies: Python, Pandas, NumPy, Scikit-learn, TA-Lib
  domain: quantitative-trading
  expertise-level: expert
---

## What I do

### Strategy Development

- Design mean-reversion strategies (pairs trading, statistical arbitrage)
- Build trend-following systems with momentum indicators
- Implement breakout and volatility-based trading strategies
- Create market-neutral and factor-based strategies

### Signal Generation

- Develop entry and exit signals using technical analysis
- Combine multiple indicators for robust signal generation
- Implement adaptive parameters that adjust to market conditions
- Create machine learning models for predictive trading signals

### Risk Management

- Design position sizing algorithms (Kelly criterion, fixed fractional)
- Implement stop-loss and take-profit mechanisms
- Create portfolio-level risk controls and exposure limits
- Build dynamic risk adjustment based on volatility

### Strategy Optimization

- Conduct parameter optimization and walk-forward analysis
- Implement ensemble methods combining multiple strategies
- Create regime detection systems for strategy switching
- Design performance attribution and strategy monitoring

## When to use me

Use this when you need to:

- Develop new trading strategies from scratch
- Optimize existing strategy parameters
- Implement risk management for automated trading
- Create signal generation systems
- Backtest and validate trading ideas
- Design multi-strategy portfolios
- Implement adaptive trading systems

## Key Expertise Areas

1. **Technical Indicators**: RSI, MACD, Bollinger Bands, Ichimoku, ATR, ADX
2. **Pattern Recognition**: Chart patterns, candlestick formations, support/resistance
3. **Statistical Arbitrage**: Pairs trading, cointegration, mean reversion
4. **Momentum Strategies**: Relative strength, price momentum, volume confirmation
5. **Volatility Trading**: VIX trading, options strategies, volatility targeting
6. **Risk Management**: Position sizing, stop-loss, portfolio optimization
7. **Execution Algorithms**: VWAP, TWAP, implementation shortfall

## Strategy Framework

### Base Strategy Class Structure

```python
class TradingStrategy:
    def __init__(self, parameters):
        self.params = parameters
        self.positions = {}

    def generate_signals(self, data):
        # Signal generation logic
        pass

    def calculate_position_size(self, signal, price, volatility):
        # Position sizing logic
        pass

    def manage_risk(self, position, market_data):
        # Risk management logic
        pass
```

### Signal Types

- **Momentum Signals**: Price momentum, relative strength, breakouts
- **Mean Reversion**: RSI extremes, Bollinger Bands, statistical edges
- **Volatility Signals**: Volatility breakout, VIX signals, options flow
- **Fundamental Signals**: P/E ratios, earnings surprises, macro data

## Risk Management Techniques

### Position Sizing

- Fixed fractional sizing (percentage of portfolio)
- Kelly criterion for optimal bet sizing
- Volatility-adjusted position sizing
- Risk parity approaches

### Stop-Loss Strategies

- Fixed percentage stop-loss
- Volatility-based stop-loss (ATR multiples)
- Time-based stop-loss
- Technical level stop-loss

### Portfolio Risk

- Correlation analysis for diversification
- Sector exposure limits
- Maximum drawdown controls
- Beta management

## Advanced Topics

### Machine Learning in Trading

- Random forests for feature importance
- SVM for classification problems
- Neural networks for pattern recognition
- Reinforcement learning for strategy optimization

### High-Frequency Trading

- Market microstructure analysis
- Latency optimization
- Order book dynamics
- Statistical arbitrage at high frequencies

### Multi-Asset Strategies

- Cross-asset arbitrage (stocks, futures, options)
- Currency carry trades
- Commodity roll yields
- Fixed income duration strategies

## Performance Metrics

- **Risk-Adjusted Returns**: Sharpe ratio, Sortino ratio, Calmar ratio
- **Drawdown Analysis**: Maximum drawdown, average drawdown, recovery time
- **Win Rate Analysis**: Profit factor, average win/loss ratio, hit rate
- **Consistency**: Monthly/quarterly win rates, rolling performance

## Implementation Considerations

### Real-World Constraints

- Transaction costs and slippage
- Market impact for large orders
- Liquidity considerations
- Regulatory compliance

### Production Deployment

- Error handling and fail-safes
- Logging and monitoring
- Performance attribution
- Strategy drift detection

I focus on practical, implementable trading strategies with robust risk management. I'll ask about market preferences, risk tolerance, and available capital when designing strategies.
