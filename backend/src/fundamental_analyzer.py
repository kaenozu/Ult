"""
ファンダメンタルズ分析モジュール
PER, PBR, 配当利回りなどを評価し、予測の信頼度を調整
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class FundamentalAnalyzer:
    def __init__(self):
        self.weights = {
            "undervalued": 1.2,  # 割安 → 予測を強める
            "fair": 1.0,  # 適正 → そのまま
            "overvalued": 0.8,  # 割高 → 予測を弱める
        }

    def analyze(self, ticker: str, fundamentals: Optional[Dict] = None) -> Dict:
        """
        ファンダメンタルズを分析し、評価結果を返す

        Returns:
            {
                'valuation': 'undervalued' | 'fair' | 'overvalued',
                'confidence_multiplier': float (0.8 ~ 1.2),
                'score': float (0 ~ 100),
                'reasons': List[str]
            }
        """
        if fundamentals is None or not fundamentals:
            # データがない場合は中立
            return {
                "valuation": "fair",
                "confidence_multiplier": 1.0,
                "score": 50,
                "reasons": ["ファンダメンタルズデータ不足"],
            }

        try:
            score = 50  # 基準点
            reasons = []

            # 1. PER (株価収益率) 分析
            per = fundamentals.get("trailingPE")
            if per:
                if per < 10:
                    score += 15
                    reasons.append(f"PER {per:.1f}x (割安)")
                elif per < 20:
                    score += 5
                    reasons.append(f"PER {per:.1f}x (適正)")
                elif per < 30:
                    score -= 5
                    reasons.append(f"PER {per:.1f}x (やや割高)")
                else:
                    score -= 15
                    reasons.append(f"PER {per:.1f}x (割高)")

            # 2. PBR (株価純資産倍率) 分析
            pbr = fundamentals.get("priceToBook")
            if pbr:
                if pbr < 1.0:
                    score += 10
                    reasons.append(f"PBR {pbr:.2f}x (割安)")
                elif pbr < 2.0:
                    score += 5
                    reasons.append(f"PBR {pbr:.2f}x (適正)")
                else:
                    score -= 5
                    reasons.append(f"PBR {pbr:.2f}x (割高)")

            # 3. 配当利回り分析
            dividend_yield = fundamentals.get("dividendYield")
            if dividend_yield:
                dividend_pct = dividend_yield * 100
                if dividend_pct > 4.0:
                    score += 10
                    reasons.append(f"配当利回り {dividend_pct:.1f}% (高配当)")
                elif dividend_pct > 2.0:
                    score += 5
                    reasons.append(f"配当利回り {dividend_pct:.1f}%")

            # 4. ROE (自己資本利益率)
            roe = fundamentals.get("returnOnEquity")
            if roe:
                roe_pct = roe * 100
                if roe_pct > 15:
                    score += 10
                    reasons.append(f"ROE {roe_pct:.1f}% (優良)")
                elif roe_pct > 10:
                    score += 5
                    reasons.append(f"ROE {roe_pct:.1f}%")
                elif roe_pct < 5:
                    score -= 10
                    reasons.append(f"ROE {roe_pct:.1f}% (低収益)")

            # 5. 評価の判定
            if score >= 70:
                valuation = "undervalued"
            elif score >= 40:
                valuation = "fair"
            else:
                valuation = "overvalued"

            confidence_multiplier = self.weights[valuation]

            return {
                "valuation": valuation,
                "confidence_multiplier": confidence_multiplier,
                "score": min(max(score, 0), 100),  # 0-100にクリップ
                "reasons": reasons,
            }

        except Exception as e:
            logger.error(f"Fundamental analysis error: {e}")
            return {
                "valuation": "fair",
                "confidence_multiplier": 1.0,
                "score": 50,
                "reasons": [f"分析エラー: {str(e)}"],
            }
