#!/usr/bin/env python3
"""
AGStock Ult Model Discussion Agent

異なるAIモデルの回答を比較・分析し、技術的な議論やコードレビューを促進するエージェント
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from urllib.parse import urlparse


# プロジェクトルートをパスに追加
def find_project_root(start_path: Path) -> Path:
    """Find project root by looking for package.json"""
    current = start_path
    while current.parent != current:
        if (current / "package.json").exists():
            return current
        current = current.parent
    raise FileNotFoundError("Project root not found")


project_root = find_project_root(Path(__file__).resolve())


@dataclass
class ModelConfig:
    """AIモデル設定"""
    name: str
    provider: str
    model: str
    api_key_env: Optional[str] = None
    api_key: Optional[str] = None
    enabled: bool = True
    api_key_required: bool = False
    local_model: bool = False
    free_api: bool = False
    specialty: Optional[str] = None  # code, general, etc.


@dataclass
class ModelResponse:
    """モデル回答"""
    model_name: str
    response: str
    tokens_used: int
    response_time: float
    success: bool
    error_message: Optional[str] = None


@dataclass
class DiscussionResult:
    """議論結果"""
    topic: str
    context: str
    responses: List[ModelResponse]
    analysis: Dict[str, Any]
    timestamp: datetime
    consensus: Optional[str] = None
    best_response: Optional[str] = None


class ModelDiscussionAgent:
    """モデル議論エージェント"""
    
    def __init__(self, config_file: Optional[Path] = None):
        self.project_root = project_root
        self.data_dir = self.project_root / ".agent" / "data" / "model_discussions"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 設定読み込み
        self.config = self._load_config(config_file)
        self.models: List[ModelConfig] = []
        
        # APIキー設定
        self._setup_api_keys()
        
        # 評価指標
        self.metrics = self.config.get("comparison_metrics", [
            "accuracy", "completeness", "clarity", "practicality", 
            "innovation", "performance_impact"
        ])
    
    def _load_config(self, config_file: Optional[Path]) -> Dict[str, Any]:
        """設定ファイル読み込み"""
        default_config = {
            "default_models": [],
            "max_tokens": 2000,
            "temperature": 0.7,
            "comparison_metrics": [],
            "output_format": "markdown",
            "save_discussions": True,
            "discussion_dir": ".agent/data/model_discussions"
        }
        
        if config_file and config_file.exists():
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                default_config.update(user_config)
                print(f"[CONFIG] 設定ファイルを読み込みました: {config_file}")
            except Exception as e:
                print(f"[WARNING] 設定ファイル読み込み失敗: {e}")
        
        return default_config
    
    def _setup_api_keys(self):
        """APIキー設定"""
        for model_data in self.config.get("default_models", []):
            api_key_required = model_data.get("api_key_required", False)
            api_key = os.getenv(model_data.get("api_key_env", "")) if api_key_required else None
            
            # APIキー不要または利用可能な場合のみ有効化
            enabled = not api_key_required or api_key is not None
            
            model = ModelConfig(
                name=model_data["name"],
                provider=model_data["provider"],
                model=model_data["model"],
                api_key_env=model_data.get("api_key_env"),
                api_key=api_key,
                enabled=enabled,
                api_key_required=api_key_required,
                local_model=model_data.get("local_model", False),
                free_api=model_data.get("free_api", False),
                specialty=model_data.get("specialty")
            )
            self.models.append(model)
            
            status = "[OK]" if enabled else "[MISSING]" if api_key_required else "[FREE]"
            print(f"[MODEL] {model.name}: {status}")
    
    def _call_openai_model(self, model: ModelConfig, prompt: str) -> ModelResponse:
        """OpenAIモデル呼び出し"""
        try:
            import openai
            
            client = openai.OpenAI(api_key=model.api_key)
            start_time = time.time()
            
            response = client.chat.completions.create(
                model=model.model,
                messages=[
                    {"role": "system", "content": "あなたは優秀なソフトウェアエンジニアです。コードレビューと技術的な議論に専門的な視点を提供してください。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.config.get("max_tokens", 2000),
                temperature=self.config.get("temperature", 0.7)
            )
            
            response_time = time.time() - start_time
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            return ModelResponse(
                model_name=model.name,
                response=content,
                tokens_used=tokens_used,
                response_time=response_time,
                success=True
            )
            
        except Exception as e:
            return ModelResponse(
                model_name=model.name,
                response="",
                tokens_used=0,
                response_time=0,
                success=False,
                error_message=str(e)
            )
    
    def _call_anthropic_model(self, model: ModelConfig, prompt: str) -> ModelResponse:
        """Anthropicモデル呼び出し"""
        try:
            import anthropic
            
            client = anthropic.Anthropic(api_key=model.api_key)
            start_time = time.time()
            
            response = client.messages.create(
                model=model.model,
                max_tokens=self.config.get("max_tokens", 2000),
                temperature=self.config.get("temperature", 0.7),
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            response_time = time.time() - start_time
            content = response.content[0].text if response.content else ""
            
            # Anthropic APIはusage情報を直接提供しない場合がある
            tokens_used = getattr(response.usage, 'total_tokens', 0) if hasattr(response, 'usage') else 0
            
            return ModelResponse(
                model_name=model.name,
                response=content,
                tokens_used=tokens_used,
                response_time=response_time,
                success=True
            )
            
        except Exception as e:
            return ModelResponse(
                model_name=model.name,
                response="",
                tokens_used=0,
                response_time=0,
                success=False,
                error_message=str(e)
            )
    
    def _call_ollama_model(self, model: ModelConfig, prompt: str) -> ModelResponse:
        """Ollamaローカルモデル呼び出し"""
        try:
            import ollama
            
            start_time = time.time()
            response = ollama.generate(
                model=model.model,
                prompt=prompt,
                options={
                    'temperature': self.config.get("temperature", 0.7),
                    'num_predict': self.config.get("max_tokens", 2000)
                }
            )
            response_time = time.time() - start_time
            
            return ModelResponse(
                model_name=model.name,
                response=response.get('response', ''),
                tokens_used=len(response.get('response', '').split()),
                response_time=response_time,
                success=True
            )
            
        except Exception as e:
            return ModelResponse(
                model_name=model.name,
                response="",
                tokens_used=0,
                response_time=0,
                success=False,
                error_message=str(e)
            )
    
    def _call_huggingface_model(self, model: ModelConfig, prompt: str) -> ModelResponse:
        """Hugging Faceモデル呼び出し（OpenCode経由）"""
        try:
            # OpenCode経由で実行
            from task import subagent_type
            
            # OpenCodeのmodel_comparisonエージェントを利用
            task_response = task(
                subagent_type="general",
                prompt=f"Compare responses for the following prompt using model {model.model}: {prompt}",
                tokensNum=5000
            )
            
            # OpenCodeからの応答を解析
            response_text = task_response.get('response', '')
            
            return ModelResponse(
                model_name=model.name,
                response=response_text,
                tokens_used=len(prompt.split()),  # 簡易的なトークン数
                response_time=2.0,  # 推定応答時間
                success=True
            )
            
        except Exception as e:
            return ModelResponse(
                model_name=model.name,
                response="",
                tokens_used=0,
                response_time=0,
                success=False,
                error_message=f"OpenCode呼び出し失敗: {str(e)}"
            )
    
    def _call_groq_model(self, model: ModelConfig, prompt: str) -> ModelResponse:
        """Groq API呼び出し"""
        try:
            from groq import Groq
            
            client = Groq(api_key=model.api_key)  # GroqはAPIキー不要の場合がある
            start_time = time.time()
            
            response = client.chat.completions.create(
                model=model.model,
                messages=[
                    {"role": "system", "content": "あなたは優秀なソフトウェアエンジニアです。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.config.get("max_tokens", 2000),
                temperature=self.config.get("temperature", 0.7)
            )
            
            response_time = time.time() - start_time
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            return ModelResponse(
                model_name=model.name,
                response=content,
                tokens_used=tokens_used,
                response_time=response_time,
                success=True
            )
            
        except Exception as e:
            return ModelResponse(
                model_name=model.name,
                response="",
                tokens_used=0,
                response_time=0,
                success=False,
                error_message=str(e)
            )
    
    def call_model(self, model: ModelConfig, prompt: str) -> ModelResponse:
        """モデル呼び出し（共通インターフェース）"""
        if not model.enabled:
            return ModelResponse(
                model_name=model.name,
                response="",
                tokens_used=0,
                response_time=0,
                success=False,
                error_message="モデルが利用できません"
            )
        
        try:
            if model.provider == "openai":
                return self._call_openai_model(model, prompt)
            elif model.provider == "anthropic":
                return self._call_anthropic_model(model, prompt)
            elif model.provider == "ollama":
                return self._call_ollama_model(model, prompt)
            elif model.provider == "huggingface":
                return self._call_huggingface_model(model, prompt)
            elif model.provider == "groq":
                return self._call_groq_model(model, prompt)
            else:
                return ModelResponse(
                    model_name=model.name,
                    response="",
                    tokens_used=0,
                    response_time=0,
                    success=False,
                    error_message=f"未対応のプロバイダー: {model.provider}"
                )
        except ImportError as e:
            return ModelResponse(
                model_name=model.name,
                response="",
                tokens_used=0,
                response_time=0,
                success=False,
                error_message=f"依存パッケージがありません: {str(e)}"
            )
    
    def generate_prompt(self, topic: str, context: str, question_type: str = "general") -> str:
        """プロンプト生成"""
        base_prompt = f"""以下の技術的なトピックについて、あなたの専門的な視点から分析してください。

トピック: {topic}

文脈:
{context}

以下の点について具体的に回答してください:
1. 問題の核心は何か
2. あなたならどのように解決するか
3. 実装時の注意点やベストプラクティス
4. パフォーマンスやセキュリティへの影響
5. 代替案や補足的な提案"""

        if question_type == "code_review":
            base_prompt += f"""

コードレビューとして、以下の点に重点を置いてください:
- コードの品質と可読性
- バグや潜在的な問題
- 改善提案
- テストカバレッジの観点"""
        
        elif question_type == "debugging":
            base_prompt += f"""

デバッグとして、以下の点に重点を置いてください:
- 問題の特定と原因分析
- ステップバイステップの解決策
- デバッグツールや手法
- 類似問題への対応方法"""
        
        return base_prompt
    
    def analyze_responses(self, responses: List[ModelResponse], topic: str) -> Dict[str, Any]:
        """回答の比較分析"""
        successful_responses = [r for r in responses if r.success]
        
        if not successful_responses:
            return {"error": "有効な回答がありません"}
        
        analysis = {
            "response_count": len(responses),
            "successful_count": len(successful_responses),
            "failed_models": [r.model_name for r in responses if not r.success],
            "average_response_time": sum(r.response_time for r in successful_responses) / len(successful_responses),
            "total_tokens_used": sum(r.tokens_used for r in successful_responses),
            "metric_scores": {},
            "strengths_comparison": {},
            "weaknesses_comparison": {},
            "consensus_points": [],
            "divergent_views": []
        }
        
        # 各指標で評価
        for metric in self.metrics:
            analysis["metric_scores"][metric] = self._evaluate_metric(successful_responses, metric)
        
        # 共通点と相違点の分析
        analysis.update(self._analyze_consensus_and_divergence(successful_responses))
        
        return analysis
    
    def _evaluate_metric(self, responses: List[ModelResponse], metric: str) -> Dict[str, float]:
        """特定指標で評価"""
        scores = {}
        
        for response in responses:
            # 簡易的な評価ロジック（実際にはより高度な分析が必要）
            score = self._calculate_metric_score(response.response, metric)
            scores[response.model_name] = score
        
        return scores
    
    def _calculate_metric_score(self, text: str, metric: str) -> float:
        """テキストから指標スコアを計算"""
        if metric == "completeness":
            # 文章の長さと構造の複雑さで評価
            return min(100, len(text.split()) / 10)
        
        elif metric == "clarity":
            # 簡潔さと専門用語の適切さで評価
            technical_terms = ["API", "データベース", "パフォーマンス", "セキュリティ", "最適化"]
            tech_count = sum(1 for term in technical_terms if term in text)
            return min(100, (len(text.split()) + tech_count * 5) / 20)
        
        elif metric == "practicality":
            # 実用性のキーワードで評価
            practical_keywords = ["実装", "具体例", "ステップ", "手法", "ツール"]
            prac_count = sum(1 for keyword in practical_keywords if keyword in text)
            return min(100, prac_count * 20)
        
        else:
            # デフォルト評価
            return min(100, len(text.split()) / 15)
    
    def _analyze_consensus_and_divergence(self, responses: List[ModelResponse]) -> Dict[str, List[str]]:
        """共通点と相違点の分析"""
        consensus_points = []
        divergent_views = []
        
        # 簡易的なキーワードベースの分析
        all_texts = [r.response for r in responses]
        
        # 共通キーワードの抽出
        common_keywords = set()
        for text in all_texts:
            words = set(text.lower().split())
            if not common_keywords:
                common_keywords = words
            else:
                common_keywords &= words
        
        consensus_points = list(common_keywords)[:5]  # 上位5個
        
        # 個別の特徴的な表現を相違点として抽出
        for response in responses:
            unique_words = set(response.response.lower().split()) - common_keywords
            if unique_words:
                sample_words = list(unique_words)[:3]
                divergent_views.append(f"{response.model_name}: {', '.join(sample_words)}")
        
        return {
            "consensus_points": consensus_points,
            "divergent_views": divergent_views
        }
    
    def identify_best_response(self, analysis: Dict[str, Any], responses: List[ModelResponse]) -> Optional[str]:
        """最良の回答を特定"""
        if not responses or not analysis.get("metric_scores"):
            return None
        
        # 総合スコアで評価
        model_scores = {}
        for response in responses:
            if response.success:
                total_score = 0
                for metric in self.metrics:
                    if metric in analysis["metric_scores"] and response.model_name in analysis["metric_scores"][metric]:
                        total_score += analysis["metric_scores"][metric][response.model_name]
                model_scores[response.model_name] = total_score
        
        if model_scores:
            best_model = max(model_scores, key=model_scores.get)
            return best_model
        
        return None
    
    def generate_consensus(self, responses: List[ModelResponse], analysis: Dict[str, Any]) -> Optional[str]:
        """コンセンサスを生成"""
        successful_responses = [r for r in responses if r.success]
        
        if len(successful_responses) < 2:
            return None
        
        consensus_points = analysis.get("consensus_points", [])
        
        if not consensus_points:
            return None
        
        # 簡易的なコンセンサス生成
        consensus = f"""各モデルの共通認識:

{chr(10).join(f"• {point}" for point in consensus_points[:5])}

最も支持されたアプローチ:
成功したモデルの回答を統合した結果、{analysis['successful_count']}モデル中の視点が反映されました。"""
        
        return consensus
    
    def discuss_topic(self, topic: str, context: str, question_type: str = "general") -> DiscussionResult:
        """トピックについて議論"""
        print(f"[DISCUSS] トピックについて議論中: {topic}")
        
        # プロンプト生成
        prompt = self.generate_prompt(topic, context, question_type)
        
        # 各モデルに質問
        responses = []
        for model in self.models:
            print(f"[ASK] {model.name}に質問中...")
            response = self.call_model(model, prompt)
            responses.append(response)
            
            if response.success:
                print(f"[OK] {model.name}: {response.tokens_used}トークン, {response.response_time:.1f}秒")
            else:
                print(f"[FAIL] {model.name}: {response.error_message}")
        
        # 分析実行
        analysis = self.analyze_responses(responses, topic)
        
        # 最良回答とコンセンサスを特定
        best_response = self.identify_best_response(analysis, responses)
        consensus = self.generate_consensus(responses, analysis)
        
        # 結果作成
        result = DiscussionResult(
            topic=topic,
            context=context,
            responses=responses,
            analysis=analysis,
            timestamp=datetime.now(),
            consensus=consensus,
            best_response=best_response
        )
        
        # 保存
        if self.config.get("save_discussions", True):
            self.save_discussion(result)
        
        return result
    
    def save_discussion(self, result: DiscussionResult):
        """議論結果を保存"""
        try:
            timestamp_str = result.timestamp.strftime("%Y%m%d_%H%M%S")
            filename = f"discussion_{timestamp_str}.json"
            filepath = self.data_dir / filename
            
            # シリアライズ可能な形式に変換
            data = {
                "topic": result.topic,
                "context": result.context,
                "timestamp": result.timestamp.isoformat(),
                "responses": [asdict(r) for r in result.responses],
                "analysis": result.analysis,
                "consensus": result.consensus,
                "best_response": result.best_response
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"[SAVE] 議論結果を保存しました: {filepath}")
            
        except Exception as e:
            print(f"[ERROR] 保存失敗: {e}")
    
    def generate_markdown_report(self, result: DiscussionResult) -> str:
        """Markdown形式のレポート生成"""
        md = f"""# モデル議論レポート

## トピック
{result.topic}

## 文脈
{result.context}

## 回答比較
"""
        
        for response in result.responses:
            status = "✅" if response.success else "❌"
            md += f"""
### {response.model_name} {status}

**応答時間**: {response.response_time:.1f}秒  
**使用トークン**: {response.tokens_used}

{response.response if response.success else f"エラー: {response.error_message}"}

---
"""
        
        if result.best_response:
            md += f"""
## 最良回答
**{result.best_response}**が最良の回答と評価されました。
"""
        
        if result.consensus:
            md += f"""
## コンセンサス
{result.consensus}
"""
        
        # 評価指標
        if result.analysis.get("metric_scores"):
            md += """
## 評価指標比較
| 指標 | " + " | ".join([r.model_name for r in result.responses if r.success]) + " |\n"
            md += "|" + "|".join(["---"] * (len([r for r in result.responses if r.success]) + 1)) + "|\n"
            
            for metric in self.metrics:
                if metric in result.analysis["metric_scores"]:
                    scores = result.analysis["metric_scores"][metric]
                    row = f"| {metric} | " + " | ".join([f"{scores.get(r.model_name, 0):.1f}" for r in result.responses if r.success]) + " |"
                    md += row + "\n"
        
        # 共通点と相違点
        if result.analysis.get("consensus_points"):
            md += """
## 共通点
""" + "\n".join(f"• {point}" for point in result.analysis["consensus_points"][:5]) + "\n"
        
        if result.analysis.get("divergent_views"):
            md += """
## 相違点
""" + "\n".join(f"• {view}" for view in result.analysis["divergent_views"]) + "\n"
        
        md += f"""
---
**生成時刻**: {result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        return md


def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description="Model Discussion Agent")
    parser.add_argument("--topic", required=True, help="議論するトピック")
    parser.add_argument("--context", help="文脈情報")
    parser.add_argument("--type", choices=["general", "code_review", "debugging"], 
                       default="general", help="質問タイプ")
    parser.add_argument("--config", help="設定ファイルパス")
    parser.add_argument("--output", help="レポート出力ファイルパス")
    parser.add_argument("--format", choices=["markdown", "json"], 
                       default="markdown", help="出力形式")
    
    args = parser.parse_args()
    
    agent = ModelDiscussionAgent(Path(args.config) if args.config else None)
    
    if not agent.models:
        print("[ERROR] 有効なモデルがありません。APIキーを確認してください。")
        sys.exit(1)
    
    # 議論実行
    context = args.context or "追加の文脈情報はありません"
    result = agent.discuss_topic(args.topic, context, args.type)
    
    # レポート生成
    if args.format == "markdown":
        report = agent.generate_markdown_report(result)
    else:
        report = json.dumps(asdict(result), ensure_ascii=False, indent=2, default=str)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"[OUTPUT] レポートを保存しました: {args.output}")
    else:
        print("\n" + "="*50)
        print(report)


if __name__ == "__main__":
    main()