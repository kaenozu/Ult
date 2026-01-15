"""
AI analyst utility with safe fallbacks.

優先順位:
    pass
1. OpenAI SDKが利用可能で、APIキーが設定済みなら実際に問い合わせ
2. そうでなければプレースホルダー回答を返し、アプリを止めない
"""

import os
from typing import Optional


class AIAnalyst:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[float] = None,
        quiet_on_missing: bool = False,
    ):
        """
        Args:
            api_key: OpenAI API key (env fallback)
            model: override model name (env ANALYST_MODEL / OPENAI_MODEL fallback)
            max_tokens: limit response tokens (env ANALYST_MAX_TOKENS fallback)
            timeout: request timeout seconds (env ANALYST_TIMEOUT fallback)
            quiet_on_missing: if True, returns空文字 instead of警告文 when disabled
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("AGSTOCK_OPENAI_API_KEY")
        self.model = model or os.getenv("ANALYST_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        self.max_tokens = max_tokens or int(os.getenv("ANALYST_MAX_TOKENS", "400"))
        self.timeout = timeout or float(os.getenv("ANALYST_TIMEOUT", "10"))
        self.quiet_on_missing = quiet_on_missing or os.getenv("ANALYST_QUIET", "").lower() in {"1", "true", "yes"}
        try:
            import openai  # type: ignore

            self._openai = openai
            if self.api_key:
                self._openai_client = openai.OpenAI(api_key=self.api_key, timeout=self.timeout)
                self.enabled = True
            else:
                self._openai_client = None
                self.enabled = False
        except Exception:
            self._openai = None
            self._openai_client = None
            self.enabled = False

    def _fallback(self, msg: str) -> str:
        return "" if self.quiet_on_missing else msg

    def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.5, **kwargs) -> str:
        """
        OpenAIが使える場合は呼び出し、使えない場合はスタブを返す。
        """
        if not self.enabled or not self._openai_client:
            return self._fallback("AI analysis unavailable (API key not configured)")

        try:
            resp = self._openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=self.max_tokens,
                **kwargs,
            )
            return resp.choices[0].message.content or self._fallback("Empty response from model")
        except Exception:
            # 安全のため、API失敗時はスタブを返す
            return self._fallback("AI analysis unavailable (API call failed)")
