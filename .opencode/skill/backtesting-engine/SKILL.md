---
name: backtesting-engine
description: Build comprehensive backtesting frameworks for trading strategies with realistic simulation, performance metrics, and risk analysis
license: MIT
compatibility: opencode
metadata:
  audience: quantitative-developers
  technologies: Python, Pandas, NumPy, Matplotlib, Zipline
  domain: backtesting
  expertise-level: expert
---

## What I do

### Backtesting Engine Design

- Create event-driven backtesting frameworks
- Implement vectorized backtesting for high-speed analysis
- Build realistic market simulators with slippage and transaction costs
- Design flexible strategy interfaces for easy strategy implementation

### Market Simulation

- Model realistic order execution and fills
- Implement market impact models for large orders
- Simulate various order types (market, limit, stop orders)
- Handle market hours, holidays, and early closes correctly

### Performance Analysis

- Calculate comprehensive performance metrics (Sharpe, Sortino, Calmar)
- Generate detailed trade analysis and attribution reports
- Create drawdown analysis and recovery statistics
- Build risk-adjusted return calculations and benchmark comparisons

### Optimization Framework

- Implement parameter optimization with walk-forward analysis
- Create robust out-of-sample testing procedures
- Design Monte Carlo simulations for strategy robustness
- Build cross-validation methods for time-series data

## When to use me

Use this when you need to:

- Test trading strategies on historical data
- Build custom backtesting frameworks
- Optimize strategy parameters without overfitting
- Analyze performance attribution of trading systems
- Compare multiple strategies on risk-adjusted basis
- Validate strategy robustness across market regimes
- Implement realistic trading cost models

## Key Expertise Areas

1. **Backtesting Architecture**: Event-driven vs vectorized, portfolio simulation
2. **Performance Metrics**: Sharpe ratio, alpha generation, information ratio
3. **Risk Analysis**: Maximum drawdown, VaR, stress testing
4. **Cost Modeling**: Transaction costs, slippage, market impact
5. **Optimization**: Parameter tuning, walk-forward analysis, robustness testing
6. **Data Handling**: Survivorship bias, look-ahead bias, data quality
7. **Visualization**: Equity curves, underwater charts, performance attribution

## Backtesting Framework Components

### Core Engine Structure

```python
class BacktestEngine:
    def __init__(self, initial_capital, start_date, end_date):
        self.initial_capital = initial_capital
        self.start_date = start_date
        self.end_date = end_date
        self.portfolio = Portfolio(initial_capital)
        self.data_handler = DataHandler()

    def run_backtest(self, strategy):
        # Main backtesting loop
        pass

    def calculate_metrics(self):
        # Performance calculation
        pass
```

### Portfolio Management

- Position tracking and cash management
- Real-time P&L calculation
- Margin and leverage handling
- Corporate action processing (splits, dividends)

## Realistic Market Modeling

### Transaction Costs

- Commission modeling (fixed, percentage-based)
- Exchange fees and regulatory fees
- Bid-ask spread implementation
- Slippage modeling based on volume and volatility

### Order Execution

- Market order fill probability models
- Limit order execution simulation
- Partial fill handling
- Order queue position modeling

### Market Impact

- Permanent vs temporary market impact
- Volume participation rate effects
- Price impact functions
- Liquidity consumption modeling

## Performance Metrics Calculation

### Risk-Adjusted Returns

- **Sharpe Ratio**: (Annual Return - Risk-Free Rate) / Annual Volatility
- **Sortino Ratio**: Similar to Sharpe but uses downside deviation
- **Calmar Ratio**: Annual Return / Maximum Drawdown
- **Information Ratio**: Excess Return / Tracking Error

### Drawdown Analysis

- Maximum drawdown calculation
- Average drawdown depth and duration
- Recovery time analysis
- Underwater curve visualization

### Trade Analysis

- Win rate and profit factor
- Average win/loss ratio
- Trade distribution analysis
- Holding period statistics

## Optimization & Validation

### Parameter Optimization

- Grid search for parameter spaces
- Genetic algorithms for complex spaces
- Bayesian optimization for efficiency
- Multi-objective optimization

### Walk-Forward Analysis

- Rolling window optimization
- Out-of-sample validation periods
- Stability testing over time
- Regime detection and adaptation

### Robustness Testing

- Monte Carlo simulation for parameter sensitivity
- Bootstrap resampling for confidence intervals
- Stress testing under extreme market conditions
- Market regime analysis

## Common Biases to Avoid

### Data Biases

- **Survivorship Bias**: Only using currently listed stocks
- **Look-ahead Bias**: Using future information in past decisions
- **Selection Bias**: Cherry-picking data or time periods
- **Data Snooping**: Overfitting to historical patterns

### Implementation Biases

- **Ignoring Transaction Costs**: Overestimating profitability
- **Unrealistic Order Assumptions**: Perfect fills at ideal prices
- **Insufficient Sample Size**: Drawing conclusions from limited data
- **Multiple Comparison Problem**: Data mining bias

## Visualization & Reporting

### Equity Curve Analysis

- Cumulative returns over time
- Benchmark comparison charts
- Rolling performance windows
- Volatility-adjusted returns

### Risk Metrics Dashboard

- Drawdown charts and recovery periods
- Rolling Sharpe ratios
- Value at Risk calculations
- Correlation with benchmarks

### Trade Analysis Reports

- Trade distribution histograms
- Winning vs losing trade analysis
- Sector attribution analysis
- Market condition performance

## Advanced Topics

### Portfolio-Level Backtesting

- Multi-asset strategy simulation
- Correlation and diversification effects
- Risk parity and allocation optimization
- Factor model integration

### High-Frequency Backtesting

- Tick-level data processing
- Market microstructure simulation
- Latency and execution quality
- Co-location effects

I focus on creating robust, realistic backtesting frameworks that account for real-world trading constraints. I'll ask about specific market conditions, data quality, and performance requirements when designing backtesting systems.
