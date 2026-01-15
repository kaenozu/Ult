import logging
import os
import google.generativeai as genai

logger = logging.getLogger(__name__)


class SelfHealingEngine:
    """
    Monitors system logs for errors and uses AI to generate/apply fixes.
    The 'Singularity' component of AGStock.
    """

    def __init__(self, log_path: str = "logs/auto_trader.log"):
        self.log_path = log_path
        self.last_position = 0
        if os.path.exists(self.log_path):
            self.last_position = os.path.getsize(self.log_path)

    def monitor_and_heal(self):
        """Scans recent logs for 'ERROR' or 'CRITICAL' and attempts healing."""
        if not os.path.exists(self.log_path):
            return

        current_size = os.path.getsize(self.log_path)
        if current_size <= self.last_position:
            return

        with open(self.log_path, "r", encoding="utf-8") as f:
            f.seek(self.last_position)
            new_logs = f.read()

        self.last_position = current_size

        if "ERROR" in new_logs or "CRITICAL" in new_logs:
            logger.warning("🛡️ Self-Healing Engine detected errors. Analyzing...")
            self._attempt_fix(new_logs)

    def _attempt_fix(self, error_context: str):
        """Uses Gemini to suggest a fix or configuration change."""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.error("Self-Healing requires GOOGLE_API_KEY.")
            return

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-pro")

        prompt = f"""
        The AGStock system encountered the following errors in its logs:
            pass
        ---
        {error_context[-2000:]}
        ---
        As an expert AI DevOps engineer, suggest a fix.
        If it's a configuration issue, suggest the new config.json value.
        If it's a code issue, provide a brief description of the fix.
        Keep it concise.
        """

        try:
            response = model.generate_content(prompt)
            logger.info(f"✨ AI Healing Suggestion: {response.text}")
        # In a real 'Singularity' scenario, we might apply the fix via file_edit tools.
        # For now, we log the path to enlightenment.
        except Exception as e:
            logger.error(f"Healing analysis failed: {e}")
