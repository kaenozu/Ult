# UI Skills レビュー結果

## レビュー対象
- `src/app/page.tsx`
- `src/components/features/dashboard/MarketStatusCard.tsx`
- `src/components/features/dashboard/AutoTradeControls.tsx`

---

## 🔴 違反一覧

### 1. `min-h-screen` の使用（`page.tsx`）

**違反箇所:**
```tsx
// Line 120, 129, 155, 164
className="min-h-screen ..."
```

**なぜ問題か:** `h-screen`/`min-h-screen`はiOSの動的ツールバーで問題が発生する

**修正案:**
```tsx
className="min-h-dvh ..."
```

---

### 2. 過剰な `animate-pulse`（MarketStatusCard、AutoTradeControls）

**違反箇所:**
```tsx
// MarketStatusCard.tsx Line 50
panic: "... animate-pulse border-2"

// MarketStatusCard.tsx Line 64
\u003cdiv className="... animate-pulse" /\u003e

// AutoTradeControls.tsx Line 60, 90
className="... animate-pulse ..."
```

**なぜ問題か:** アニメーションは明示的に要求されない限り追加すべきではない

**修正案:** ローディング状態以外での`animate-pulse`を削除、または`prefers-reduced-motion`を尊重

---

### 3. `backdrop-blur` の使用（AutoTradeControls）

**違反箇所:**
```tsx
// Line 225
className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm ..."
```

**なぜ問題か:** 大きな`backdrop-filter`サーフェスはパフォーマンスに悪影響

**修正案:**
```tsx
className="fixed inset-0 z-50 bg-black/90"  // Remove backdrop-blur
```

---

### 4. 任意の `z-*` 値（AutoTradeControls）

**違反箇所:**
```tsx
// Line 225
className="... z-50 ..."
```

**なぜ問題か:** 固定されたz-indexスケールを使用すべき

**修正案:** z-indexユーティリティを定義（例: `z-modal`, `z-overlay`）

---

### 5. 見出しに `text-balance` 欠如

**違反箇所:**
```tsx
// page.tsx Line 194, 208, 223, 236, 258, 281
\u003ch2 className="text-xl font-bold tracking-tight ..."\u003e
```

**なぜ問題か:** 見出しには`text-balance`を使用すべき

**修正案:**
```tsx
\u003ch2 className="text-xl font-bold tracking-tight text-balance ..."\u003e
```

---

### 6. データに `tabular-nums` 欠如

**違反箇所:**
```tsx
// MarketStatusCard.tsx Line 83
CONF: {(confidence * 100).toFixed(0)}%

// AutoTradeControls.tsx Line 150
¥{status.config?.max_budget_per_trade.toLocaleString()}
```

**なぜ問題か:** 数値データには`tabular-nums`で等幅数字を使用すべき

**修正案:**
```tsx
\u003cspan className="font-mono tabular-nums"\u003e
```

---

## 📊 違反サマリー

| カテゴリ | 違反数 | 重要度 |
|----------|--------|--------|
| Interaction (`h-screen`) | 4 | 高 |
| Animation (`animate-pulse`) | 4 | 中 |
| Performance (`backdrop-blur`) | 1 | 高 |
| Layout (arbitrary `z-*`) | 1 | 低 |
| Typography (`text-balance`) | 6 | 低 |
| Typography (`tabular-nums`) | 2 | 低 |

---

## 🔧 優先修正リスト

1. **高優先度:** `min-h-screen` → `min-h-dvh`
2. **高優先度:** `backdrop-blur-sm` → 削除
3. **中優先度:** 不要な`animate-pulse`を削除
4. **低優先度:** `text-balance`、`tabular-nums`追加
