import base64
import io
import logging
import os
from typing import Any, Dict, Optional

import google.generativeai as genai
import matplotlib.pyplot as plt
import pandas as pd

logger = logging.getLogger(__name__)


class ChartVisionEngine:
    """
    Translates market data into visual representations (images) and uses
    Gemini Vision to interpret geometric patterns (Head and Shoulders, etc.)
    """

    def __init__(self):
        self.has_vision = False
        self._init_gemini()

    def _init_gemini(self):
        """Init Gemini Vision model."""
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                genai.configure(api_key=api_key)
                # Use 1.5 Flash for high speed multimodal
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                self.has_vision = True
                logger.info("ChartVisionEngine initialized with Gemini 1.5.")
            except Exception as e:
                logger.error(f"Failed to init Gemini Vision: {e}")

    def analyze_chart_vision(self, df: pd.DataFrame, ticker: str) -> Optional[Dict[str, Any]]:
        """
        1. Generates a visual plot of the OHLC data.
        2. Sends to Gemini Vision for pattern analysis.
        """
        if not self.has_vision or df is None or df.empty:
            return None

        try:
            # 1. Generate chart image
            plt.figure(figsize=(10, 6))
            df_tail = df.tail(60)  # Last 60 bars

            # Using standard plot (Close price)
            plt.plot(df_tail.index, df_tail["Close"], label="Close Price", color="cyan", linewidth=2)

            # Add simple SMAs for visual context
            plt.plot(
                df_tail.index, df_tail["Close"].rolling(window=20).mean(), label="20 SMA", color="orange", alpha=0.7
            )

            plt.title(f"{ticker} Technical Layout", color="white")
            plt.grid(True, alpha=0.2)
            plt.legend()

            # Dark mode aesthetic
            ax = plt.gca()
            ax.set_facecolor("#1e1e1e")
            plt.gcf().set_facecolor("#1e1e1e")
            ax.tick_params(colors="white")
            for spine in ax.spines.values():
                spine.set_color("white")

            buf = io.BytesIO()
            plt.savefig(buf, format="png", bbox_inches="tight")
            plt.close()
            image_bytes = buf.getvalue()

            # 2. Prepare Prompt
            prompt = f"""
            Analyze this price chart for {ticker}.
            TASK:
            1. Identify geometric patterns (Head & Shoulders, Double Top/Bottom, Triangles, etc.).
            2. Identify key support and resistance levels visible in the chart.
            3. Provide a visual verdict (BULLISH, BEARISH, or NEUTRAL).

            Return ONLY a valid JSON object:
            {{
                "patterns": ["pattern1", "pattern2"],
                "support": 1234.5,
                "resistance": 1250.0,
                "verdict": "BULLISH",
                "visual_rationale": "Explanation based on the image..."
            }}
            """

            # 3. Call Gemini
            response = self.model.generate_content([prompt, {"mime_type": "image/png", "data": image_bytes}])

            # 4. Parse
            import json

            text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)

        except Exception as e:
            logger.error(f"Chart vision analysis failed for {ticker}: {e}")
            return None

    def get_image_base64(self, df: pd.DataFrame) -> str:
        """Utility for UI to display the same 'vision' the AI saw."""
        if df is None or df.empty:
            return ""

        plt.figure(figsize=(10, 4))
        df_tail = df.tail(60)
        plt.plot(df_tail.index, df_tail["Close"], color="cyan")
        plt.title("AI Visual Perspective", color="white")

        ax = plt.gca()
        ax.set_facecolor("#1e1e1e")
        plt.gcf().set_facecolor("#1e1e1e")
        ax.tick_params(colors="white")

        buf = io.BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight")
        plt.close()
        return base64.b64encode(buf.getvalue()).decode("utf-8")
