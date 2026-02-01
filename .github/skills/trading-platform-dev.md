# Agent Skill: Trading Platform Development

## 概要
このスキルは、Trading Platformプロジェクト（kaenozu/Ult）固有の開発ガイドラインです。

## プロジェクト構成

### ディレクトリ構造
```
trading-platform/
├── app/
│   ├── api/           # Next.js API Routes
│   ├── components/    # React Components
│   ├── hooks/         # Custom Hooks
│   ├── lib/           # Business Logic
│   ├── store/         # Zustand Stores
│   ├── types/         # TypeScript Types
│   └── workers/       # Web Workers
├── e2e/               # Playwright E2E Tests
└── __tests__/         # Jest Unit Tests
```

### 重要なファイル
- `app/lib/AnalysisService.ts` - コア分析ロジック
- `app/lib/websocket.ts` - WebSocket実装
- `app/store/tradingStore.ts` - トレーディング状態管理
- `app/hooks/useWebSocket.ts` - WebSocketフック

## 技術スタック

### フロントエンド
- Next.js 16.x
- React 19.x
- TypeScript 5.x
- Tailwind CSS 4.x
- Chart.js 4.x
- Zustand 5.x

### バックエンド
- Next.js API Routes
- WebSocket (ws library)
- Alpha Vantage API
- Yahoo Finance API

### テスト
- Jest 30.x
- Playwright 1.48.x
- React Testing Library

## 開発パターン

### 1. Storeパターン
```typescript
// Zustandストアの標準パターン
import { create } from 'zustand';

interface TradingState {
  positions: Position[];
  addPosition: (position: Position) => void;
  removePosition: (symbol: string) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  positions: [],
  addPosition: (position) => set((state) => ({
    positions: [...state.positions, position]
  })),
  removePosition: (symbol) => set((state) => ({
    positions: state.positions.filter(p => p.symbol !== symbol)
  })),
}));
```

### 2. Hookパターン
```typescript
// WebSocketフックの標準パターン
export function useWebSocket(url: string, options?: WebSocketOptions) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    const client = new WebSocketClient(url, {
      onMessage: (msg) => setData(msg),
      onStatusChange: setStatus,
    });
    
    client.connect();
    
    return () => client.disconnect();
  }, [url]);
  
  return { status, data };
}
```

### 3. API Routeパターン
```typescript
// APIルートの標準パターン
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }
    
    const data = await fetchMarketData(symbol);
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

## 既知の技術負債

### 解決済み
- ✅ AnalysisServiceの重複計算（Issue #209）
- ✅ Alpha Vantage削除（PR #221）
- ✅ WebSocket安定性改善（PR #223）

### 対応中
- 🔄 ATR計算の統一（Issue #270）
- 🔄 ErrorBoundary適用（Issue #259）
- 🔄 any型の排除（Issue #269）

### 未対応
- ⏳ ドキュメント整備（Issue #230）
- ⏳ テストカバレッジ向上
- ⏳ パフォーマンス計測基盤

## セキュリティ要件

### 必須チェック
- [ ] XSSサニタイズ（DOMPurify）
- [ ] API入力検証（Zod）
- [ ] レート制限（ip-rate-limit.ts）
- [ ] 認証ミドルウェア

### 禁止パターン
```typescript
// ❌ 禁止: 直接DOM操作
document.innerHTML = userInput;

// ❌ 禁止: eval使用
eval(userCode);

// ❌ 禁止: any型
data: any

// ❌ 禁止: 未検証URLパラメータ
fetch(`/api/${userInput}`);
```

## パフォーマンス要件

### 推奨パターン
```typescript
// ✅ useMemoで高価計算をキャッシュ
const chartData = useMemo(() => {
  return processData(rawData);
}, [rawData]);

// ✅ useCallbackでイベントハンドラをメモ化
const handleClick = useCallback(() => {
  doSomething();
}, []);

// ✅ React.memoで不要な再レンダリング防止
const MemoizedComponent = React.memo(Component);
```

### 避けるべきパターン
```typescript
// ❌ インライン関数
<button onClick={() => doSomething()}>

// ❌ 配列インデックスをkeyとして使用
{items.map((item, i) => <div key={i} />)}

// ❌ 不要な状態更新
setState(prev => [...prev]); // 同じ値なら更新不要
```

## テスト戦略

### ユニットテスト
```bash
# 単一ファイルのテスト
npm test -- app/lib/analysis.test.ts

# カバレッジ付き
npm run test:coverage

# ウォッチモード
npm run test:watch
```

### E2Eテスト
```bash
# 全E2Eテスト
npm run test:e2e

# UIモード
npm run test:e2e:ui

# 特定テスト
npx playwright test main.spec.ts
```

### 重要なテストファイル
- `app/lib/__tests__/riskManagement.test.ts`
- `app/hooks/__tests__/useWebSocket.test.ts`
- `e2e/main.spec.ts`
- `e2e/trading-workflow.spec.ts`

## 開発サーバー操作

```bash
# 開発サーバー起動
npm run dev

# WebSocketサーバー起動
npm run ws:server

# 両方同時に（別ターミナル）
npm run dev & npm run ws:server
```

## デプロイメント

### ビルド
```bash
npm run build
```

### 静的エクスポート
```bash
# next.config.tsでoutput: 'export'を設定
npm run build
```

## 環境変数

```env
# 必須
ALPHA_VANTAGE_API_KEY=your_key_here
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# オプション
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## トラブルシューティング

### WebSocket接続エラー
1. WebSocketサーバーが起動しているか確認
2. ポート競合を確認（3001）
3. ファイアウォール設定を確認

### メモリリーク警告
1. クリーンアップ関数を確認
2. useEffectの依存配列を確認
3. イベントリスナーの削除を確認

### ビルドエラー
1. TypeScriptエラーを修正
2. 未使用インポートを削除
3. 型定義を更新

## 関連ドキュメント
- FOR_OPENCODE.md - プロジェクト履歴
- .github/skills/pr-management.md - PR管理
- .github/skills/code-review.md - コードレビュー
