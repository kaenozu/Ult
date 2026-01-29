# Type Safety Improvement Plan - any型撲滅プロジェクト

## 📊 分析サマリー

### any型使用状況

検索結果から、以下のカテゴリにany型が使用されていることが判明しました：

#### 1. **APIレスポンスデータ (最優先)**
- **ファイル**: `alpha-vantage.ts`, `MarketDataService.ts`
- **問題**: APIレスポンスをanyでキャスト
- **件数**: 約8箇所

#### 2. **テストファイルのモック (低優先)**
- **ファイル**: `*.test.ts`, `*.test.tsx`
- **問題**: テスト用モックデータの型定義
- **件数**: 約40箇所

#### 3. **ストアアクセス (中優先)**
- **ファイル**: `useWebSocket.ts`, 各種テスト
- **問題**: Zustandストアの内部アクセス
- **件数**: 約15箇所

#### 4. **外部ライブラリ連携 (中優先)**
- **ファイル**: Chart.js関連、WebSocket関連
- **問題**: サードパーティライブラリの型定義
- **件数**: 約10箇所

---

## 🎯 優先順位と実装計画

### Phase 1: APIレスポンス型定義（最重要）

#### 対象ファイル
1. `app/lib/api/alpha-vantage.ts`
2. `app/lib/MarketDataService.ts`

#### 実装内容

**1.1 AlphaVantage API型定義**

```typescript
// types/api.ts (新規作成)
export interface AlphaVantageTimeSeriesEntry {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

export interface AlphaVantageIntradayResponse {
  'Meta Data': Record<string, string>;
  [key: `Time Series (${string})`]: Record<string, AlphaVantageTimeSeriesEntry>;
}

export interface AlphaVantageTechnicalIndicatorEntry {
  RSI?: string;
  SMA?: string;
  EMA?: string;
}

export interface AlphaVantageTechnicalResponse {
  'Technical Analysis: RSI'?: Record<string, AlphaVantageTechnicalIndicatorEntry>;
  'Technical Analysis: SMA'?: Record<string, AlphaVantageTechnicalIndicatorEntry>;
  'Technical Analysis: EMA'?: Record<string, AlphaVantageTechnicalIndicatorEntry>;
}
```

**1.2 MarketDataService型定義**

```typescript
// types/market.ts (拡張)
export interface MarketDataResponse {
  success: boolean;
  data?: Array<{
    date: string;
    open: string | number;
    high: string | number;
    low: string | number;
    close: string | number;
    volume: string | number;
  }>;
  error?: string;
}
```

### Phase 2: ビジネスロジック層の型定義

#### 対象ファイル
1. `app/components/SignalPanel/BacktestView.tsx`
2. `app/hooks/useWebSocket.ts`

#### 実装内容

**2.1 BacktestViewのTrade型**

```typescript
// types/backtest.ts (拡張)
export interface BacktestTrade {
  type: 'BUY' | 'SELL';
  entryDate: string;
  entryPrice: number;
  exitDate?: string;
  exitPrice?: number;
  profitPercent: number;
  profitAmount: number;
}
```

**2.2 WebSocketメッセージ型**

```typescript
// types/websocket.ts (新規作成)
export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}
```

### Phase 3: テストファイルの型安全性（段階的）

#### 方針
- テストファイルのany型は実行時には影響しないため、本番コード優先
- 段階的に`jest.Mock`や適切な型に置き換え

---

## 📋 実装タスク一覧

### タスク1: API型定義の作成
- [ ] `types/api.ts` - AlphaVantage API型定義
- [ ] `types/market.ts` - 市場データAPI型定義
- [ ] `types/websocket.ts` - WebSocket型定義

### タスク2: alpha-vantage.tsの修正
- [ ] `getIntraday`メソッドの型修正
- [ ] `getDailyBars`メソッドの型修正
- [ ] `getRSI`/`getSMA`/`getEMA`メソッドの型修正
- [ ] バリデーション関数の型修正

### タスク3: MarketDataService.tsの修正
- [ ] APIレスポンスの型付け
- [ ] データマッピングの型安全性確保

### タスク4: UIコンポーネントの修正
- [ ] `BacktestView.tsx`のtrade型定義
- [ ] その他UIコンポーネントのany型修正

### タスク5: フックの修正
- [ ] `useWebSocket.ts`のメッセージ型定義
- [ ] その他カスタムフックの型修正

---

## 🔧 実装アプローチ

### 段階的移行戦略

1. **型定義の追加**: まず新しい型定義を作成
2. **1ファイルずつ修正**: 影響範囲を限定して段階的に移行
3. **テストの更新**: 各修正後にテストを実行
4. **型チェック**: `tsc --noEmit`で型エラーを確認

### 型ガードの活用

```typescript
// 型ガード関数の例
function isAlphaVantageTimeSeries(data: unknown): data is AlphaVantageTimeSeriesEntry {
  return (
    typeof data === 'object' &&
    data !== null &&
    '1. open' in data &&
    '2. high' in data &&
    '3. low' in data &&
    '4. close' in data &&
    '5. volume' in data
  );
}
```

### unknown型への移行

```typescript
// Before
const data = await response.json() as any;

// After
const data: unknown = await response.json();
if (isValidMarketData(data)) {
  // 型安全な処理
}
```

---

## 📈 期待される効果

1. **コンパイル時の型安全性**: 実行前にエラーを検出
2. **IDEサポートの向上**: 自動補完と型推論
3. **リファクタリングの安全性**: 型チェックによる安全な変更
4. **ドキュメント化**: 型定義がコードの仕様を説明

---

## ⚠️ リスクと注意点

1. **実行時エラーの可能性**: 型定義と実際のAPIレスポンスの不一致
2. **移行コスト**: 大規模な変更による一時的な生産性低下
3. **テストの必要性**: 型変更後の動作確認が必須

---

## 🚀 次のアクション

1. **型定義ファイルの作成**から開始
2. **alpha-vantage.ts**を最初の修正対象に選択
3. 各修正後に**テスト実行**と**型チェック**を実施
4. 段階的に他のファイルへ展開
