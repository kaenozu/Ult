"""
GPT-4V統合AIモデル管理
マルチモーダルAIとビジョン分析を統合
"""

import asyncio
import logging
import os
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import base64
import json
import aiohttp
from pathlib import Path

logger = logging.getLogger(__name__)


class GPT4VisionIntegration:
    """
    GPT-4V統合クラス
    テキスト、画像、音声を統合的に処理
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or "sk-test-key"
        self.base_url = "https://api.openai.com/v1"
        self.vision_model = "gpt-4-vision-preview"
        self.text_model = "gpt-4-turbo"

    async def analyze_chart_image(self, image_data: bytes, question: str) -> Dict[str, Any]:
        """
        チャート画像を分析

        Args:
            image_data: 画像データ（バイト列）
            question: ユーザーの質問

        Returns:
            分析結果
        """
        try:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

            payload = {
                "model": self.vision_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"この株式チャートについて{question}を分析してください。株価、トレンド、重要なポイントを教えてください。日本語で回答してください。",
                            },
                            {
                                "type": "image_url",
                                "image_url": f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}",
                            },
                        ],
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.3,
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "analysis": result["choices"][0]["message"]["content"],
                            "model_used": self.vision_model,
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        logger.error(f"Vision API error: {response.status}")
                        return {"success": False, "error": f"API error: {response.status}"}

        except asyncio.TimeoutError:
            logger.error("Vision API timeout")
            return {"success": False, "error": "Request timeout"}
        except Exception as e:
            logger.error(f"Vision analysis failed: {e}")
            return {"success": False, "error": str(e)}

    async def analyze_financial_document(self, image_data: bytes, doc_type: str = "financial_report") -> Dict[str, Any]:
        """
        財務文書を分析

        Args:
            image_data: 画像データ
            doc_type: 文書タイプ

        Returns:
            分析結果
        """
        prompts = {
            "financial_report": """
                この財務諸表を分析してください。以下の点について教えてください：
                1. 売上高の変化
                2. 利益率の傾向
                3. 重要な指標（ROE、ROA、自己資本比率など）
                4. リスク要因
                5. 今後の見通し
                
                日本語で分かりやすく説明してください。
                """,
            "earnings_report": """
                この決算短信を分析してください：
                1. 売上高と前年比
                2. 事業部門別の業績
                3. 今後の業績見通し
                4. 注目すべき点
                
                投資家の視点で分析してください。
                """,
            "research_report": """
                このリサーチレポートを分析してください：
                1. 要約と結論
                2. 投資判断材料
                3. ターゲット企業評価
                4. リスクとリターン
                
                詳細な分析をお願いします。
                """,
            "market_data": """
                この市場データを分析してください：
                1. 市場のトレンド
                2. 重要な変化
                3. 投資機会
                4. リスク要因
                
                マクロな視点で説明してください。
                """,
        }

        prompt = prompts.get(doc_type, prompts["financial_report"])

        try:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

            payload = {
                "model": self.vision_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}",
                            },
                        ],
                    }
                ],
                "max_tokens": 1500,
                "temperature": 0.2,
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status == 200:
                        result = await response.json()

                        # 構造化された回答を抽出
                        content = result["choices"][0]["message"]["content"]

                        return {
                            "success": True,
                            "content": content,
                            "doc_type": doc_type,
                            "structured_data": self._extract_structured_data(content),
                            "model_used": self.vision_model,
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        return {"success": False, "error": f"API error: {response.status}"}

        except Exception as e:
            logger.error(f"Document analysis failed: {e}")
            return {"success": False, "error": str(e)}

    async def analyze_multiple_charts(self, chart_images: List[bytes], questions: List[str]) -> List[Dict[str, Any]]:
        """
        複数のチャートを一括分析

        Args:
            chart_images: 画像データリスト
            questions: 質問リスト

        Returns:
            分析結果リスト
        """
        tasks = []
        for i, (image, question) in enumerate(zip(chart_images, questions)):
            task = self.analyze_chart_image(image, question)
            tasks.append(task)

        # 並列実行
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 成功した結果のみを返す
        valid_results = []
        for result in results:
            if not isinstance(result, Exception) and result.get("success"):
                valid_results.append(result)
            elif isinstance(result, Exception):
                logger.error(f"Chart analysis error: {result}")

        return valid_results

    def _extract_structured_data(self, content: str) -> Dict[str, Any]:
        """
        回答から構造化データを抽出

        Args:
            content: AIの回答テキスト

        Returns:
            構造化されたデータ
        """
        structured_data = {"trends": [], "key_points": [], "metrics": {}, "risks": [], "opportunities": []}

        lines = content.split("\n")
        for line in lines:
            line = line.strip()

            # トレンド情報を抽出
            if "トレンド" in line or "傾向" in line:
                structured_data["trends"].append(line)

            # 重要なポイントを抽出
            elif any(keyword in line for keyword in ["重要", "注目", "注意", "推奨"]):
                structured_data["key_points"].append(line)

            # 数値データを抽出
            elif any(metric in line for metric in ["%", "倍", "円", "時", "%"]):
                structured_data["metrics"][f"metric_{len(structured_data['metrics'])}"] = line

            # リスクを抽出
            elif any(risk in line for risk in ["リスク", "リターン", "変動", "下落"]):
                structured_data["risks"].append(line)

            # 機会を抽出
            elif any(opp in line for opp in ["機会", "有望", "買い", "投資"]):
                structured_data["opportunities"].append(line)

        return structured_data

    async def generate_investment_advice(self, portfolio_data: Dict, market_context: Dict) -> Dict[str, Any]:
        """
        ポートフォリオに基づいた投資アドバイスを生成

        Args:
            portfolio_data: ポートフォリオデータ
            market_context: 市場コンテキスト

        Returns:
            投資アドバイス
        """
        portfolio_summary = self._create_portfolio_summary(portfolio_data)
        market_summary = self._create_market_summary(market_context)

        prompt = f"""
        以下のポートフォリオと市場状況を分析し、投資アドバイスを生成してください。

        【ポートフォリオ概要】
        {portfolio_summary}

        【市場状況】
        {market_summary}

        以下の観点からアドバイスをお願いします：
        1. リスク管理方針
        2. 資成の見直し提案
        3. 新規投資の機会
        4. 利益確定のタイミング
        5. 今後の注目セクター
        
        投資初心者にも分かるよう、具体的で実行可能なアドバイスをください。
        日本語で回答してください。
        """

        try:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

            payload = {
                "model": self.text_model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 2000,
                "temperature": 0.3,
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result["choices"][0]["message"]["content"]

                        # アドバイスを構造化
                        structured_advice = self._structure_investment_advice(content)

                        return {
                            "success": True,
                            "advice": structured_advice,
                            "raw_content": content,
                            "model_used": self.text_model,
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        return {"success": False, "error": f"API error: {response.status}"}

        except Exception as e:
            logger.error(f"Advice generation failed: {e}")
            return {"success": False, "error": str(e)}

    def _create_portfolio_summary(self, portfolio_data: Dict) -> str:
        """ポートフォリオ概要を作成"""
        if not portfolio_data or "positions" not in portfolio_data:
            return "ポートフォリオデータがありません"

        positions = portfolio_data["positions"]
        total_value = sum(pos.get("market_value", 0) for pos in positions)

        summary_parts = [
            f"総資産価値: {total_value:,}円",
            f"保有銘柄数: {len(positions)}",
            f"主要銘柄: {', '.join([pos.get('name', pos.get('ticker', '')) for pos in positions[:5]])}",
        ]

        return "\n".join(summary_parts)

    def _create_market_summary(self, market_context: Dict) -> str:
        """市場概要を作成"""
        if not market_context:
            return "市場データがありません"

        summary_parts = [
            f"日経平均: {market_context.get('nikkei', 'N/A')}円",
            f"S&P500: {market_context.get('sp500', 'N/A')}ドル",
            f"ドル円: {market_context.get('usdjpy', 'N/A')}円",
            f"市場センチメント: {market_context.get('sentiment', 'N/A')}",
        ]

        return "\n".join(summary_parts)

    def _structure_investment_advice(self, content: str) -> Dict[str, Any]:
        """投資アドバイスを構造化"""
        structured_advice = {
            "risk_management": [],
            "rebalancing": [],
            "new_opportunities": [],
            "profit_taking": [],
            "focus_sectors": [],
            "overall_strategy": "",
            "confidence_level": "medium",
        }

        lines = content.split("\n")

        current_section = None

        for line in lines:
            line = line.strip()

            # セクションの特定
            if "リスク管理" in line or "リスク" in line:
                current_section = "risk_management"
            elif "リバランス" in line or "見直し" in line or "再配分" in line:
                current_section = "rebalancing"
            elif "機会" in line or "新規" in line or "新た" in line:
                current_section = "new_opportunities"
            elif "利益" in line or "確定" in line or "売却" in line:
                current_section = "profit_taking"
            elif "セクター" in line or "注目" in line:
                current_section = "focus_sectors"
            elif "戦略" in line or "全体的" in line:
                current_section = "overall_strategy"

            # 各セクションの内容を保存
            if current_section:
                if line and not line.startswith("1.") and not line.startswith("2."):
                    structured_advice[current_section].append(line)

        # 全体戦略を最終的な判断として設定
        if structured_advice["risk_management"] and structured_advice["rebalancing"]:
            structured_advice["overall_strategy"] = "リスク管理とポートフォリオバランスを重視"
            structured_advice["confidence_level"] = "high"
        elif structured_advice["new_opportunities"]:
            structured_advice["overall_strategy"] = "成長機会を積極的に探求"
            structured_advice["confidence_level"] = "high"

        return structured_advice

    async def analyze_sentiment_from_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        画像から市場センチメントを分析

        Args:
            image_data: 画像データ

        Returns:
            センチメント分析結果
        """
        try:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

            payload = {
                "model": self.vision_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "この画像に含まれる市場関連の情報から、投資家心理センチメントを分析してください。楽観的か悲観的か、その根拠も教えてください。日本語で回答してください。",
                            },
                            {
                                "type": "image_url",
                                "image_url": f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}",
                            },
                        ],
                    }
                ],
                "max_tokens": 800,
                "temperature": 0.3,
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=20),
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result["choices"][0]["message"]["content"]

                        # センチメントをスコアリング
                        sentiment_score = self._calculate_sentiment_score(content)

                        return {
                            "success": True,
                            "sentiment": content,
                            "sentiment_score": sentiment_score,
                            "sentiment_label": self._classify_sentiment(sentiment_score),
                            "model_used": self.vision_model,
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        return {"success": False, "error": f"API error: {response.status}"}

        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return {"success": False, "error": str(e)}

    def _calculate_sentiment_score(self, content: str) -> float:
        """センチメントスコアを計算"""
        positive_keywords = ["楽観", "好調", "上昇", "成長", "強気", "期待", "楽観的"]
        negative_keywords = ["悲観", "軟調", "下落", "懸念", "不安", "懸念的", "懸念"]

        score = 0.0

        for keyword in positive_keywords:
            if keyword in content:
                score += 1.0

        for keyword in negative_keywords:
            if keyword in content:
                score -= 1.0

        # スコアを正規化
        return max(-1.0, min(1.0, score / 10))

    def _classify_sentiment(self, score: float) -> str:
        """センチメントを分類"""
        if score > 0.3:
            return "非常に楽観"
        elif score > 0.1:
            return "楽観的"
        elif score > -0.1:
            return "中立"
        elif score > -0.3:
            return "悲観的"
        else:
            return "非常に悲観"


# グローバルインスタンス
gpt4_vision = GPT4VisionIntegration()
