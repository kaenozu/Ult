---
name: hive_architect
description: Phase 15 "Mechanical Hive" (合意形成エンジン) の設計・実装・調整を行うためのスキル。Tech, News, Riskの3つの視点を統合し、最適な意思決定ロジックを構築します。
---

# Hive Architect (合意形成エンジニア)

このスキルは、**Phase 15: Mechanical Hive ("The Iron Hive")** の実装と運用を支援するために設計されています。
LLMに依存しない「純粋論理と数学」による意思決定エンジン (`consensus_engine.py`) を構築します。

## 🧠 Core Philosophy
1.  **Context Economy:** 高価なLLM推論を避け、数理的アルゴリズムを優先する。
2.  **Safety First:** Risk Agentによる「拒否権 (Veto)」を絶対視する。
3.  **Weighted Democracy:** 実績のあるエージェント（Tech）に高い重みを与える。

## 🛠️ Capabilities

### 1. Consensus Engine Implementation
合意形成エンジンのコアロジックを実装・更新します。

- **Target File:** `backend/src/agents/consensus_engine.py`
- **Algorithm:**
  ```python
  score = (Tech_Signal * 0.5) + (News_Sentiment * 0.3) + (Risk_Inverse * 0.2)
  if Risk_Status == "CRITICAL":
      return ACTION.HOLD (Veto Triggered)
  if score > 0.3: return ACTION.BUY
  if score < -0.3: return ACTION.SELL
  ```

### 2. Weight Calibration (重み調整)
バックテストや実績に基づいて、各エージェントの「発言力（Weight）」を調整します。
*   "Tech Agentの調子が悪い" -> Techの重みを 0.5 -> 0.4 に下げ、Newsを上げる等の提案を行います。

### 3. Veto Protocol Verification
「暴落時（VIX急騰時）に正しく買い注文がブロックされるか」を検証するテストケースを生成します。

## 📋 Workflow
1.  **Status Check:** 現在の各エージェント (`StrategyRouter`, `ShockRadar`, `MarketStatus`) の実装状況を確認する。
2.  **Blueprint:** `consensus_engine.py` の仕様を策定する（または更新する）。
3.  **Simulate:** 架空の市場データ（暴落シナリオなど）を入力し、Hiveが正しい判断を下せるかシミュレーションする。
4.  **Refine:** しきい値や重みを微調整する。

## 💻 Usage Example
User: "News重視のHiveを作って"
User: "合意形成のロジックをテストして"
User: "今の重み配分は適正か？"
