# Protocol Test: Next-Gen Backtesting Features

**Facilitator:** Antigravity  
**Model:** `opencode/big-pickle`  
**Topic:** Interactive Brainstorming for Backtesting Engine

Following the defined protocol, I decomposed the topic into "Metrics" and "Visualization" and queried OpenCode.

## 📊 Round 1: Advanced Metrics
OpenCode suggested the following quantifiable metrics:
1.  **Calmar Ratio:** (Annualized Return / Max Drawdown). Excellent for assessing return relative to downside risk.
2.  **Sortino Ratio:** Focuses only on harmful volatility (downside deviation), unlike Sharpe which penalizes all volatility.
3.  **Expectancy per Trade:** The average P&L per trade. Helps determine if the edge is statistical or luck.

## 🎨 Round 2: Visualization Concepts
OpenCode proposed these innovative ways to view performance:
1.  **"Drawdown Landscape" 3D Map:** Visualizing drawdowns not as a line, but as a "valley" depth map to show duration and severity intuitively.
2.  **Trade Cluster Heatmap:** Coloring trade entry/exits on the chart based on P&L intensity (Green=Profit, Red=Loss), highlighting profitable zones.
3.  **Monte Carlo Fan Chart:** Overlaying 1000 simulated future paths based on historical stats to show probability cones of future equity.

## 🤖 Facilitator's Synthesis (Antigravity)
The suggestion of **Monte Carlo Fan Charts** is particularly powerful. It moves backtesting from "what happened" to "what is likely to happen," aligning perfectly with our new "AI Oracle" theme.
The **Calmar Ratio** is also a robust addition for our crypto-heavy users, as they care deeply about drawdown depth.

**Action Item:**
I recommend adding a "Monte Carlo Simulator" tab to the Backtest Results page in Phase 4.
