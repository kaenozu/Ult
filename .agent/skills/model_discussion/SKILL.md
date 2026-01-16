# Model Discussion Agent

## Overview

Model Discussion Agentは、異なるAIモデルの回答を比較・分析し、技術的な議論やコードレビューを促進するエージェントスキルです。

## Features

### 🔍 Multi-Model Comparison

- **Multiple AI Models**: 10+モデル（GPT-4, Claude-3, Llama, GLM, Code Fastなど）同時比較
- **Parallel Processing**: 各モデルに同時に質問して効率的な比較
- **Response Analysis**: 回答の品質、正確性、実用性を多角的に評価
- **Consensus Building**: 複数モデルの意見から共通認識を特定
- **OpenCode Integration**: 全モデルをOpenCode経由で実行可能

### 📊 Comprehensive Metrics

- **Accuracy**: 技術的な正確さ
- **Completeness**: 回答の網羅性
- **Clarity**: 表現の明瞭さ
- **Practicality**: 実用性と実装可能性
- **Innovation**: 革新的な視点
- **Performance Impact**: パフォーマンスへの影響評価

### 🛠️ Discussion Types

- **General Discussion**: 一般的な技術議論
- **Code Review**: コードレビューと改善提案
- **Debugging**: デバッグアプローチの比較
- **Architecture Design**: 設計思想の比較

### 📈 Analysis Features

- **Consensus Points**: 各モデルの共通認識を抽出
- **Divergent Views**: 異なる視点や相違点を特定
- **Best Response**: 総合評価に基づく最良回答の選定
- **Scoring System**: 定量的な評価スコア提供

## Installation

### Dependencies

```bash
pip install openai anthropic requests
```

### Environment Variables

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## Usage

### Basic Discussion

```bash
python scripts/discuss.py --topic "Reactコンポーネントの最適化手法について"
```

### Code Review

```bash
python scripts/discuss.py --topic "このReactフックの改善点をレビューしてください" \
    --context "$(cat Component.tsx)" --type code_review
```

### Debugging Discussion

```bash
python scripts/discuss.py --topic "APIレスポンスが遅い問題" \
    --context "React Query使用、バックエンドはFastAPI" --type debugging
```

### Custom Output

```bash
python scripts/discuss.py --topic "議論トピック" \
    --output discussion_report.md --format markdown
```

## Configuration

### Model Configuration

```json
{
  "default_models": [
    {
      "name": "GPT-4",
      "provider": "openai",
      "model": "gpt-4",
      "api_key_env": "OPENAI_API_KEY"
    },
    {
      "name": "Claude-3",
      "provider": "anthropic",
      "model": "claude-3-sonnet-20240229",
      "api_key_env": "ANTHROPIC_API_KEY"
    }
  ]
}
```

### Metrics Configuration

```json
{
  "comparison_metrics": [
    "accuracy",
    "completeness",
    "clarity",
    "practicality",
    "innovation",
    "performance_impact"
  ],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

## Output Examples

### Console Output

```
[MODEL] GPT-4: [OK]
[MODEL] Claude-3: [OK]
[MODEL] GPT-3.5-Turbo: [MISSING]

[ASK] GPT-4に質問中...
[OK] GPT-4: 450トークン, 2.3秒
[OK] Claude-3: 380トークン, 1.8秒

[SAVE] 議論結果を保存しました: .agent/data/model_discussions/discussion_20260116_143022.json
```

### Markdown Report Structure

```markdown
# モデル議論レポート

## トピック

Reactコンポーネントの最適化手法について

## 回答比較

### GPT-4 ✅

**応答時間**: 2.3秒  
**使用トークン**: 450

[回答内容...]

### Claude-3 ✅

**応答時間**: 1.8秒  
**使用トークン**: 380

[回答内容...]

## 評価指標比較

| 指標         | GPT-4 | Claude-3 |
| ------------ | ----- | -------- |
| accuracy     | 85.2  | 88.7     |
| completeness | 92.1  | 86.3     |
| clarity      | 88.5  | 91.2     |

## 最良回答

**Claude-3**が最良の回答と評価されました。

## コンセンサス

各モデルの共通認識:
• useMemoの使用
• コンポーネント分割
• 状態管理の最適化
```

## Data Management

### Discussion Storage

- **Location**: `.agent/data/model_discussions/`
- **Format**: JSON with timestamps
- **Retention**: Configurable cleanup
- **Search**: By topic, timestamp, models

### Data Structure

```json
{
  "topic": "React optimization",
  "context": "...",
  "timestamp": "2026-01-16T14:30:22",
  "responses": [...],
  "analysis": {
    "metric_scores": {...},
    "consensus_points": [...],
    "divergent_views": [...]
  },
  "consensus": "...",
  "best_response": "Claude-3"
}
```

## Advanced Features

### Custom Metrics

独自の評価指標を定義可能：

```python
def _calculate_metric_score(self, text: str, metric: str) -> float:
    if metric == "custom_metric":
        # カスタム評価ロジック
        return custom_score
```

### Model Provider Extension

新しいAIプロバイダーを追加可能：

```python
def _call_custom_model(self, model: ModelConfig, prompt: str) -> ModelResponse:
    # カスタムAPI呼び出し
    return ModelResponse(...)
```

### Prompt Templates

質問タイプ別にプロンプトテンプレートをカスタマイズ：

- **General**: 幅広い技術議論
- **Code Review**: 品質と改善点の分析
- **Debugging**: 問題解決アプローチの比較

## Integration with AGStock Ult

### Use Cases

1. **Architecture Decisions**: システム設計の最適案を複数モデルで比較
2. **Code Quality Assurance**: コードレビューの網羅性向上
3. **Problem Solving**: 複雑な技術課題への多角的アプローチ
4. **Best Practices**: 業界標準と最新技術動向の確認

### Benefits

- **Bias Reduction**: 複数モデルの意見により個別バイアスを低減
- **Quality Improvement**: 多様な視点から最適解を導出
- **Knowledge Integration**: 異なるモデルの強みを統合
- **Decision Support**: データに基づく技術的意思決定支援

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - 環境変数の設定を確認
   - APIキーの有効期限を確認
   - ネットワーク接続を確認

2. **Missing Models**
   - `skill.json`のモデル設定を確認
   - APIプロバイダーのサービス状態を確認

3. **Low Quality Responses**
   - トピックと文脈の具体性を向上
   - temperatureパラメータを調整
   - max_tokens制限を確認

### Debug Mode

```bash
python scripts/discuss.py --topic "test" --context "debug" --type general --config debug_config.json
```

## Future Enhancements

- **More Models**: Gemini, Llama, Mistralなど追加対応
- **Real-time Collaboration**: ライブ議論機能
- **Code Execution**: 提案コードの自動テスト
- **Integration Testing**: 複数モデル提案の統合テスト
- **Learning System**: 過去議論からの学習と推薦改善
