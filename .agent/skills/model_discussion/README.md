# Model Discussion Agent

AGStock Ult用のAIモデル比較・議論エージェント。

## Quick Start

### OpenCode経由での議論（推奨）

```bash
python .agent/skills/model_discussion/opencode_discussion.py "React最適化について" "パフォーマンス問題"
```

### 手動実行

```bash
python .agent/skills/model_discussion/opencode_discussion.py "コードレビュー依頼"
```

## 主な機能

- ✅ 4モデル同時比較（Big-Pickle, GLM-4.7, MiniMax-M2.1, Grok-Code-Fast-1）
- ✅ OpenCode経由での全モデル実行（APIキー不要）
- ✅ 自動分析とコンセンサス抽出
- ✅ 詳細なレポート生成（JSON）
- ✅ 議論データの保存と分析
- ✅ 最良回答の特定

## 対応モデル

- **Big-Pickle** - 総合的な分析
- **GLM-4.7** - 技術的な深さ
- **MiniMax-M2.1** - 実用的な提案
- **Grok-Code-Fast-1** - コード専門の回答

## 対応モデル

### 商用APIモデル

- **GPT-4** / **GPT-3.5-Turbo** (OpenAI)
- **Claude-3** (Anthropic)

### 無料・ローカルモデル

- **Llama-3-8B** / **Mistral-7B** (Ollama)
- **Groq-Llama3** (Groq - 無料API)

### 中国系モデル

- **GLM-4** / **Bigmodel-ChatGLM** (THUDM)
- **Minimax-ABAB** (01-ai)

### コード専門モデル

- **Code-Fast** (CodeLlama)
- **Qwen-2.5-Coder** (Qwen)
- **DeepSeek-Coder** (DeepSeek)

## 評価指標

- **Accuracy**: 技術的正確さ
- **Completeness**: 回答の網羅性
- **Clarity**: 表現の明瞭さ
- **Practicality**: 実用性
- **Innovation**: 革新的な視点
- **Performance Impact**: パフォーマンス影響

## 出力例

```
[MODEL] GPT-4: [OK]
[MODEL] Claude-3: [OK]
[OK] GPT-4: 450トークン, 2.3秒
[OK] Claude-3: 380トークン, 1.8秒
[BEST] Claude-3が最良の回答と評価されました
```

詳細なドキュメントは `SKILL.md` を参照してください。
