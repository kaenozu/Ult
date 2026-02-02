# 残りの技術的負債対応ロードマップ

**作成日**: 2026-01-29  
**プロジェクト**: Trader Pro - 個人開発向け実用的改善計画  
**対象**: TOP 3 Critical Issues完了後の残タスク

---

## 📊 優先度マトリックス

| 優先度 | 複雑さ | 効果 | 作業項目 |
|--------|--------|------|----------|
| P1 | 低 | 高 | エラーハンドリング統一 |
| P1 | 中 | 高 | 型安全性向上（any撲滅） |
| P2 | 低 | 中 | パフォーマンス計測導入 |
| P2 | 低 | 中 | ドキュメント整備 |
| P3 | 中 | 低 | コンポーネント分割 |

---

## 🎯 推奨作業項目（5個）

### 1. エラーハンドリング統一 【P1 / 複雑さ: 低 / 効果: 高】

**現状の問題**:
```typescript
// 散在するエラーハンドリングパターン
try {
  const result = await fetchData();
} catch (e) {
  console.error(e); // 単純なログ出力
  // または
  throw e; // 再スロー
  // または
  return null; // null返却
}
```

**提案する統一パターン**:
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high'
  ) {
    super(message);
  }
}

export const handleError = (error: unknown, context: string): AppError => {
  if (error instanceof AppError) return error;
  return new AppError(String(error), 'UNKNOWN', 'medium');
};
```

**作業内容**:
1. 統一エラークラス作成（30分）
2. 主要API呼び出しのラップ（1時間）
3. UIエラー表示コンポーネント作成（1時間）

**期待効果**:
- デバッグ効率向上
- ユーザー体験改善
- 保守性向上

---

### 2. 型安全性向上 - any撲滅キャンペーン 【P1 / 複雑さ: 中 / 効果: 高】

**現状の問題**:
```typescript
// any型の使用例（検索で発見）
const data = await response.json() as Record<string, unknown>;
// または
const result: any = fetchSomething();
```

**提案する改善**:
```typescript
// 厳格な型定義
interface ApiResponse<T> {
  data: T;
  error?: string;
}

// unknownを使用して型安全に
const data: unknown = await response.json();
if (isValidResponse(data)) {
  // 型ガードで絞り込み
}
```

**作業内容**:
1. `any`型の使用箇所を検索（15分）
2. 重要な箇所から順に型付け（2-3時間）
3. 型ガード関数作成（1時間）

**期待効果**:
- コンパイル時エラー検出
- リファクタリング安全性
- IDEサポート向上

---

### 3. パフォーマンス計測導入 【P2 / 複雑さ: 低 / 効果: 中】

**提案する実装**:
```typescript
// lib/performance.ts
export const measurePerformance = <T>(
  name: string,
  fn: () => T
): T => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
};

// React Component用
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[Render] ${componentName}: ${(end - start).toFixed(2)}ms`);
    };
  });
};
```

**作業内容**:
1. 計測ユーティリティ作成（30分）
2. 主要コンポーネントへの適用（1時間）
3. バックテスト計測の強化（30分）

**期待効果**:
- ボトルネック可視化
- パフォーマンス回帰防止
- 最適化優先順位判断

---

### 4. ドキュメント整備 【P2 / 複雑さ: 低 / 効果: 中】

**提案する整備内容**:

```markdown
# README.md 改善案

## クイックスタート
```bash
npm install
npm run dev
```

## 主要機能
- 株価チャート表示
- テクニカル分析（RSI, SMA, ボリンジャーバンド）
- バックテスト機能
- AI予測

## アーキテクチャ概要
[簡単な図または説明]

## 環境変数
| 変数名 | 説明 | 必須 |
|--------|------|------|
| ALPHA_VANTAGE_API_KEY | APIキー | Yes |
```

**作業内容**:
1. README.md更新（1時間）
2. 環境変数テンプレート作成（15分）
3. 主要コンポーネントのJSDoc追加（1-2時間）

**期待効果**:
- 開発効率向上
- 障害対応時間短縮
- 将来的な拡張容易性

---

### 5. 魔法の数値の定数化 【P2 / 複雑さ: 低 / 効果: 中】

**現状の問題**:
```typescript
// 散在するハードコード値
if (confidence >= 80) { ... }  // 何の80？
if (data.length < 60) { ... }   // 60は何？
const step = 3;                 // 3は何？
```

**提案する改善**:
```typescript
// constants.ts に集約
export const SIGNAL_THRESHOLDS = {
  HIGH_CONFIDENCE: 80,
  MEDIUM_CONFIDENCE: 60,
  MIN_DATA_POINTS: 60,
} as const;

export const BACKTEST_CONFIG = {
  WARMUP_PERIOD: 100,
  STEP_SIZE: 3,
} as const;
```

**作業内容**:
1. ハードコード値の検索（30分）
2. 定数ファイルへの移行（1-2時間）
3. 既存コードの置き換え（1時間）

**期待効果**:
- 可読性向上
- 変更容易性
- バグ防止

---

## 📅 推奨実装順序

### Week 1: 基盤整備
- [ ] Day 1-2: エラーハンドリング統一（P1）
- [ ] Day 3-4: any型撲滅（P1）

### Week 2: 品質向上
- [ ] Day 1-2: パフォーマンス計測導入（P2）
- [ ] Day 3: ドキュメント整備（P2）
- [ ] Day 4-5: 魔法の数値定数化（P2）

---

## 🎯 実装の判断基準

### やるべき（優先度高）
- ✅ エラーハンドリング統一（低コスト・高効果）
- ✅ any型撲滅（中コスト・高効果）

### 必要に応じて（優先度中）
- 🟡 パフォーマンス計測（開発中のみ有効化）
- 🟡 ドキュメント整備（自分だけが使うなら最小限でOK）
- 🟡 定数化（新規コードから適用、既存は段階的に）

### 保留（優先度低）
- ❌ StockChart分割（現状動作しているため）
- ❌ 大規模リファクタリング（問題発生時に対応）

---

## 💡 個人開発向けアドバイス

### 効率化のコツ
1. **段階的改善**: 一度に全部やらず、ファイルを開いた時に少しずつ
2. **自動化活用**: ESLintルールでany型を警告
3. **実用主義**: 完璧より動作するものを優先
4. **TODOコメント**: 後回しにする場合は必ず理由を記載

### 時間配分の目安
- 新機能開発: 70%
- 技術的負債対応: 20%
- ドキュメント: 10%

---

## 📝 まとめ

| 順位 | 作業項目 | 工数 | 優先理由 |
|------|----------|------|----------|
| 1 | エラーハンドリング統一 | 2.5時間 | デバッグ効率向上 |
| 2 | any型撲滅 | 3-4時間 | 型安全性確保 |
| 3 | パフォーマンス計測 | 2時間 | 最適化の指針 |
| 4 | ドキュメント整備 | 2-3時間 | 長期的効率 |
| 5 | 定数化 | 2-3時間 | 保守性向上 |

**合計: 約12-15時間**

**推奨**: 週末や空き時間を使って、1項目ずつ着実に進める。
