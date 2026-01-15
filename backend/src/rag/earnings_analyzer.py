"""
Earnings Analyzer
LLMを使用して決算短信を分析
"""

import json
import logging
import os
from typing import Dict, Any

import google.generativeai as genai

from src.rag.earnings_rag import EarningsRAG

logger = logging.getLogger(__name__)


class EarningsAnalyzer:
    """
    LLMを使用した決算分析器
    """

    def __init__(self, model_name: str = "gemini-1.5-pro"):
        """
        初期化

        Args:
            model_name: 使用するGeminiモデル名
        """
        self.model_name = model_name

        # Gemini API設定
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.warning("No Gemini API key found. Analyzer will not work.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(model_name)
            logger.info(f"Initialized Gemini model: {model_name}")

    def analyze(self, pdf_data: Dict[str, Any], rag_engine: EarningsRAG = None, doc_id: str = None) -> Dict[str, Any]:
        """
        決算を分析

        Args:
            pdf_data: PDFローダーから取得したデータ
            rag_engine: RAGエンジン（オプション）
            doc_id: ドキュメントID（RAG使用時）

        Returns:
            分析結果
        """
        if not self.model:
            return {"error": "Model not initialized"}

        try:
            # コンテキスト準備
            context = self._prepare_context(pdf_data, rag_engine, doc_id)

            # プロンプト生成
            prompt = self._create_analysis_prompt(context)

            # LLM実行
            logger.info("Analyzing earnings with LLM...")
            response = self.model.generate_content(prompt)

            # JSON抽出
            result = self._extract_json_from_response(response.text)

            logger.info("Analysis completed successfully")
            return result

        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return {"error": str(e)}

    def _prepare_context(self, pdf_data: Dict[str, Any], rag_engine: EarningsRAG = None, doc_id: str = None) -> str:
        """
        分析用のコンテキストを準備

        Args:
            pdf_data: PDFデータ
            rag_engine: RAGエンジン
            doc_id: ドキュメントID

        Returns:
            コンテキスト文字列
        """
        context_parts = []

        # 基本情報
        metadata = pdf_data.get("metadata", {})
        if metadata:
            context_parts.append("【企業情報】")
            context_parts.append(f"企業名: {metadata.get('company', '不明')}")
            context_parts.append(f"発表日: {metadata.get('date', '不明')}")
            context_parts.append("")

        # RAGを使用して関連情報を取得
        if rag_engine and doc_id:
            logger.info("Using RAG to retrieve relevant context")

            # 重要な質問で検索
            key_questions = ["売上高と利益の推移は？", "主要な事業トピックは？", "リスク要因は？", "今後の見通しは？"]

            for question in key_questions:
                results = rag_engine.query(question, n_results=2, filter_doc_id=doc_id)
                if results:
                    context_parts.append(f"【{question}】")
                    for r in results:
                        context_parts.append(r["text"])
                    context_parts.append("")
        else:
            # RAG未使用の場合は全文を使用（制限あり）
            text = pdf_data.get("text", "")
            if text:
                # 最初の5000文字のみ使用
                context_parts.append("【決算短信（抜粋）】")
                context_parts.append(text[:5000])

        # テーブルデータ
        tables = pdf_data.get("tables", [])
        if tables:
            context_parts.append("【財務データ】")
            for i, table in enumerate(tables[:3]):  # 最初の3つのテーブルのみ
                context_parts.append(f"テーブル{i + 1}:")
                context_parts.append(table.to_string() if hasattr(table, "to_string") else str(table))
                context_parts.append("")

        return "\n".join(context_parts)

    def _create_analysis_prompt(self, context: str) -> str:
        """
        分析用プロンプトを生成

        Args:
            context: コンテキスト

        Returns:
            プロンプト
        """
        prompt = f"""あなたは経験豊富な金融アナリストです。以下の決算短信を分析し、投資判断に必要な情報を抽出してください。

{context}

【分析項目】
1. **業績サマリー**: 売上高、営業利益、純利益の前年比成長率
2. **主要トピック**: 決算で特に注目すべき事業トピックや戦略（3つまで）
3. **リスク要因**: 投資家が注意すべきリスク（3つまで）
4. **センチメント**: 全体的な決算内容の評価（POSITIVE/NEUTRAL/NEGATIVE）
5. **投資判断**: BUY/HOLD/SELL のいずれか
6. **信頼度**: 判断の信頼度（0.0〜1.0）
7. **理由**: 投資判断の根拠（100文字程度）
8. **セクター・業種**: 企業のセクター（例：IT、製造、金融）と詳細な業種

以下のJSON形式で回答してください：

```json
{{
  "summary": {{
    "revenue_growth": 0.15,
    "operating_profit_growth": 0.20,
    "net_profit_growth": 0.18
  }},
  "key_topics": [
    "新製品の好調な販売",
    "海外市場での拡大",
    "コスト削減施策の効果"
  ],
  "risk_factors": [
    "原材料価格の上昇",
    "為替変動リスク",
    "競合他社の台頭"
  ],
  "sentiment": "POSITIVE",
  "recommendation": "BUY",
  "confidence": 0.75,
  "reasoning": "売上・利益ともに好調で、新製品の貢献が大きい。ただし原材料価格上昇がリスク要因。",
  "sector": "製造",
  "industry": "電子部品"
}}
```

JSONのみを返してください。説明文は不要です。
"""
        return prompt

    def _extract_json_from_response(self, response_text: str) -> Dict[str, Any]:
        """
        LLMレスポンスからJSONを抽出

        Args:
            response_text: LLMのレスポンステキスト

        Returns:
            抽出されたJSON
        """
        try:
            # コードブロックを削除
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            text = text.strip()

            # JSON解析
            result = json.loads(text)
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.debug(f"Response text: {response_text}")

            # フォールバック: 基本的な構造を返す
            return {
                "summary": {},
                "key_topics": [],
                "risk_factors": [],
                "sentiment": "NEUTRAL",
                "recommendation": "HOLD",
                "confidence": 0.5,
                "reasoning": "分析に失敗しました",
                "raw_response": response_text,
            }

    def quick_summary(self, pdf_data: Dict[str, Any]) -> str:
        """
        簡易サマリーを生成（JSON不要の場合）

        Args:
            pdf_data: PDFデータ

        Returns:
            サマリーテキスト
        """
        if not self.model:
            return "モデルが初期化されていません"

        try:
            text = pdf_data.get("text", "")[:3000]

            prompt = f"""以下の決算短信を200文字程度で要約してください：

{text}

要約:"""

            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            logger.error(f"Quick summary failed: {e}")
            return f"要約生成に失敗しました: {str(e)}"


if __name__ == "__main__":
    # テスト
    logging.basicConfig(level=logging.INFO)

    analyzer = EarningsAnalyzer()

    # サンプルデータ
    sample_pdf_data = {
        "text": """
        当社の2024年第3四半期決算について報告いたします。

        売上高: 1000億円（前年同期比+15%）
        営業利益: 120億円（前年同期比+20%）
        純利益: 80億円（前年同期比+18%）

        主要トピック:
        - 新製品Aの販売が好調で、売上の30%を占める
        - 海外市場での売上が前年比+25%と大幅増
        - コスト削減施策により、利益率が改善

        リスク要因:
        - 原材料価格の上昇圧力
        - 為替変動による影響
        - 競合他社の新製品投入
        """,
        "metadata": {"company": "サンプル株式会社", "date": "2024-11-01"},
    }

    # 分析実行
    result = analyzer.analyze(sample_pdf_data)
    print(json.dumps(result, ensure_ascii=False, indent=2))
