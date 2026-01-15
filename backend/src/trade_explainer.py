"""
Trade Explainer Module
Generates natural language explanations for trade decisions.
"""

from typing import Any, Dict, Optional

from src.ai_analyst import AIAnalyst
from src.prompts import TRADE_REASONING_SYSTEM_PROMPT


class TradeExplainer:
    def __init__(self):
        self.analyst = AIAnalyst()

    def explain_trade(
        self,
        ticker: str,
        action: str,
        price: float,
        technical_indicators: Dict[str, float],
        market_regime: Optional[Dict[str, Any]] = None,
        strategy_name: str = "Unknown",
    ) -> str:
        """
        Generate explanation for a trade decision.

        Args:
            ticker: Stock ticker
            action: BUY or SELL
            price: Trade price
            technical_indicators: Dict of indicator values (RSI, MACD, etc.)
            market_regime: Current market regime info
            strategy_name: Name of strategy that generated signal

        Returns:
            Natural language explanation in Japanese
        """
        if not self.analyst.enabled:
            return "AI Analyst is disabled. Please configure OpenAI API key."

        # Build context
        context = f"""
## Trade Details
- Ticker: {ticker}
- Action: {action}
- Price: ¥{price:,.2f}
- Strategy: {strategy_name}

## Technical Indicators
"""
        for indicator, value in technical_indicators.items():
            context += f"- {indicator}: {value:.2f}\n"

        if market_regime:
            context += "\n## Market Regime\n"
            context += f"- Trend: {market_regime.get('trend', 'N/A')}\n"
            context += f"- Volatility: {market_regime.get('volatility', 'N/A')}\n"
            context += f"- ADX: {market_regime.get('adx', 'N/A'):.1f}\n"

        # Generate explanation
        explanation = self.analyst.generate_response(
            system_prompt=TRADE_REASONING_SYSTEM_PROMPT,
            user_prompt=f"Please explain this trade decision:\n\n{context}",
            temperature=0.5,
        )

        return explanation

    def explain_no_trade(
        self,
        ticker: str,
        reason: str,
        technical_indicators: Dict[str, float],
        market_regime: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Explain why a trade was NOT made.
        """
        if not self.analyst.enabled:
            return "AI Analyst is disabled."

        context = f"""
## No Trade Decision
- Ticker: {ticker}
- Reason: {reason}

## Technical Indicators
"""
        for indicator, value in technical_indicators.items():
            context += f"- {indicator}: {value:.2f}\n"

        if market_regime:
            context += "\n## Market Regime\n"
            context += f"- Trend: {market_regime.get('trend', 'N/A')}\n"
            context += f"- Volatility: {market_regime.get('volatility', 'N/A')}\n"

        prompt = f"Please explain why we did NOT trade this stock:\n\n{context}"

        explanation = self.analyst.generate_response(
            system_prompt=TRADE_REASONING_SYSTEM_PROMPT, user_prompt=prompt, temperature=0.5
        )

        return explanation
