import logging
import os
import google.generativeai as genai

logger = logging.getLogger(__name__)


class StrategyBreeder:
    """
    Bio-Inspired Autonomy: 'Breeds' two trading strategies to create
    a more powerful hybrid strategy code.
    """

    def __init__(self):
        self.model_name = "gemini-1.5-pro"

    def breed_strategies(self, parent_a_code: str, parent_b_code: str) -> str:
        """
        Uses Gemini to combine logic from two parent strategies.
        """
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return "# Breeding Failed: No API Key"

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(self.model_name)

        prompt = f"""
        Act as a Quantitative Trading Architect. I have two successful trading strategies.
        Your task is to 'Breed' them into a single Hybrid Strategy.

        PARENT A CODE:
            pass
        ```python
        {parent_a_code}
        ```

        PARENT B CODE:
            pass
        ```python
        {parent_b_code}
        ```

        INSTRUCTION:
            pass
        Create a new Python class `HybridStrategy` that inherits from a generic `BaseStrategy`.
        It should intelligently combine the entry/exit logic of both parents into a more
        robust signal generation method. Ensure the code is production-ready.

        ONLY return the Python code block.
        """

        try:
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Strategy breeding failed: {e}")
            return f"# Breeding Exception: {str(e)}"
