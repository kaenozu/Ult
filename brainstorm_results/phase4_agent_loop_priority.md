# 激論: Phase 4 実装優先順位

## 📅 セッション概要
*   **テーマ:** "Phase 4 Implementation Order: What comes next?"
*   **日時:** 2026-01-18 07:09 JST
*   **参加メンバー:** Qwen (Speed Optimizer), Antigravity (Pilot)

---

## 🗺️ 現状分析

### Phase 4: Autonomous Ghost Personas
| タスク | 状態 | 説明 |
|--------|------|------|
| CircuitBreaker | ✅ 完了 | Hard Budget Limit & Kill Switch |
| WebSocket Types | ✅ 完了 | ApprovalPayloads修正済み |
| Async Agent Loop | ❌ 未実装 | Redis Stream / Fire-and-forget |
| NeuralMonitor | ❌ 未実装 | Realtime Thought Process Display |
| Semi-Auto Mode | ❌ 未実装 | Human-in-the-loop approval |

### 既存インフラ
- ✅ WebSocket接続動作確認済み
- ✅ `approval_service.py` 存在
- ✅ `CircuitBreaker` 実装済み

---

## ⚡ Qwenの分析 (Speed Optimizer)

### 依存関係
```
Async Agent Loop (Foundation)
        ↓
   ┌────┴────┐
   ↓         ↓
Semi-Auto   NeuralMonitor
  Mode      (Visualization)
(Safety)
```

### 複雑さ vs インパクト
| コンポーネント | 複雑さ | インパクト | 優先度 |
|--------------|--------|----------|--------|
| Async Agent Loop | 高 | 最高 | **1位** |
| Semi-Auto Mode | 中 | 高 | 2位 |
| NeuralMonitor | 中〜高 | 中 | 3位 |

### リスク分析
| コンポーネント | ボトルネック | リスク |
|--------------|-------------|--------|
| Agent Loop | Redis接続、メッセージ処理遅延 | メッセージロス、スケーラビリティ |
| Semi-Auto | 人間の応答時間 | バックログ蓄積 |
| NeuralMonitor | 監視オーバーヘッド | パフォーマンス低下 |

---

## ⚖️ Antigravity's Verdict

**裁定: Foundation-First Architecture**

### 実装順序

1. **Async Agent Loop** (Redis Stream)
   - 全ての基盤となるコア機能
   - これなしに他は動かない

2. **Semi-Auto Mode** (Human-in-the-loop)
   - 安全層として必須
   - 既存の`approval_service.py`を活用

3. **NeuralMonitor** (Visualization)
   - 可視化・デバッグ層
   - 上記2つが完成してから

---

## 📋 即座の次アクション

### Agent Loop 実装計画
```
1. [ ] Redis接続設定 (または代替としてメモリキュー)
2. [ ] AgentLoopクラスの設計
3. [ ] WebSocket経由でThought/Action配信
4. [ ] CircuitBreakerとの統合
```

### 技術選択
- **Redis Stream**: 本格運用向け
- **asyncio.Queue**: 軽量代替（ローカル開発向け）

---

> **Antigravity's Note:**
> "Qwenの分析に同意。Agent Loopが全ての土台。
> ただし、Redisが重すぎる場合はasyncio.Queueでプロトタイプを作り、後でRedisに移行する戦略も有効。
> まずは動くものを作り、最適化は後から。"
