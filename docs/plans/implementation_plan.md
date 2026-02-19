# Implementation Plan: バックテスト強化（取引コストシミュレーション）

## [Overview]
既存のRealisticBacktestEngineを拡張し、取引コストシミュレーションのためのUIコンポーネント、ブローカー設定管理、コスト影響分析レポート機能を統合する。

### 背景と目的
現在、バックテストエンジン（`RealisticBacktestEngine.ts`）は以下の機能を実装済みです：
- ボリュームベースのマーケットインパクト
- 動的スリッページ（時間帯・ボラティリティ連動）
- 階層的手数料構造
- ビッド・アスクスプレッドモデリング

しかし、これらの設定をユーザーが簡単に構成・可視化するためのUIが不足しています。また、複数の証券会社（ブローカー）設定の管理や、取引コストがパフォーマンスに与える影響を分析するレポート機能も必要です。

この実装により、ユーザーはより現実的なバックテスト条件を設定でき、実際の取引コストが戦略パフォーマンスに与える影響を定量的に評価できます。

## [Types]
TypeScript型定義の拡張と新規インターフェースの追加。

```typescript
// app/lib/backtest/types.ts に追加

// ブローカー設定
export interface BrokerConfig {
  id: string;
  name: string;
  market: 'japan' | 'usa';
  commission: {
    type: 'percentage' | 'per_share' | 'fixed';
    value: number;
    min?: number;
    max?: number;
  };
  fees: {
    secFee?: boolean;      // SEC Fee (米国のみ)
    tafFee?: boolean;      // TAF Fee (米国のみ)
    fxFee?: boolean;       // 為替手数料
    consumptionTax?: number; // 消費税率（日本のみ）
  };
  settlement: 'same-day' | 't1' | 't2';
}

// 取引コスト設定
export interface TransactionCostSettings {
  enabled: boolean;
  brokerId: string;
  slippageModel: 'fixed' | 'volatility' | 'market_impact';
  slippageValue: number;  // 固定値または係数
  spreadModel: 'fixed' | 'dynamic';
  spreadValue: number;
  partialFillSimulation: boolean;
  latencySimulation: boolean;
  latencyMs: number;
}

// コスト分析レポート
export interface CostAnalysisReport {
  summary: {
    totalTrades: number;
    totalCost: number;
    costAsPercentOfProfit: number;
    costAsPercentOfVolume: number;
  };
  breakdown: {
    commissions: number;
    slippage: number;
    spread: number;
    marketImpact: number;
    fees: number;
  };
  byTrade: Array<{
    tradeId: string;
    entryCost: number;
    exitCost: number;
    totalCost: number;
    costPercent: number;
  }>;
  impact: {
    grossProfit: number;
    netProfit: number;
    profitReductionPercent: number;
    sharpeRatioWithoutCosts: number;
    sharpeRatioWithCosts: number;
  };
  sensitivity: {
    slippageLevels: number[];
    profitAtLevel: number[];
  };
}

// コスト設定プリセット
export interface CostSettingsPreset {
  id: string;
  name: string;
  description: string;
  settings: TransactionCostSettings;
  isDefault?: boolean;
}
```

## [Files]
7つの新規ファイルを作成し、4つの既存ファイルを修正する。

### 新規ファイル

1. **`app/components/backtest/CostSettingsPanel.tsx`**
   - 取引コスト設定パネルUI
   - ブローカー選択、スリッページ設定、スプレッド設定

2. **`app/components/backtest/BrokerSelector.tsx`**
   - 証券会社（ブローカー）選択コンポーネント
   - プリセットブローカーリスト表示

3. **`app/components/backtest/CostBreakdownChart.tsx`**
   - コスト内訳の円グラフ・棒グラフ表示
   - Chart.js使用

4. **`app/components/backtest/CostImpactReport.tsx`**
   - コスト影響分析レポート表示
   - センシティビティ分析結果

5. **`app/lib/backtest/brokerPresets.ts`**
   - 主要証券会社の手数料プリセット
   - SBI証券、楽天証券、Interactive Brokers等

6. **`app/lib/backtest/CostAnalysisService.ts`**
   - コスト分析ビジネスロジック
   - レポート生成、センシティビティ分析

7. **`app/lib/backtest/costSettingsStore.ts`**
   - コスト設定の永続化（Zustandストア）
   - ユーザー設定の保存・復元

### 修正ファイル

1. **`app/lib/backtest/types.ts`**
   - 上記の新規型定義を追加

2. **`app/lib/backtest/RealisticBacktestEngine.ts`**
   - `TransactionCostSettings`対応
   - ブローカー設定連携

3. **`app/components/backtest/index.ts`**
   - 新規コンポーネントのエクスポート追加

4. **`app/lib/backtest/index.ts`**
   - 新規サービス・プリセットのエクスポート追加

## [Functions]
15個の新規関数と3個の修正関数。

### 新規関数

**CostSettingsPanel.tsx**
- `CostSettingsPanel(props: CostSettingsPanelProps): React.ReactNode`
- `handleBrokerChange(brokerId: string): void`
- `handleSlippageModelChange(model: SlippageModel): void`
- `handleSavePreset(name: string): void`

**BrokerSelector.tsx**
- `BrokerSelector(props: BrokerSelectorProps): React.ReactNode`
- `getBrokerLogo(brokerId: string): string`
- `formatCommissionDisplay(broker: BrokerConfig): string`

**CostBreakdownChart.tsx**
- `CostBreakdownChart(props: CostBreakdownChartProps): React.ReactNode`
- `prepareChartData(report: CostAnalysisReport): ChartData`

**CostImpactReport.tsx**
- `CostImpactReport(props: CostImpactReportProps): React.ReactNode`
- `calculateImpactSeverity(reductionPercent: number): 'low' | 'medium' | 'high'`
- `generateSensitivityTable(report: CostAnalysisReport): SensitivityRow[]`

**CostAnalysisService.ts**
- `generateCostAnalysisReport(result: BacktestResult): CostAnalysisReport`
- `calculateCostByTrade(trade: Trade, brokerConfig: BrokerConfig): TradeCost`
- `runSensitivityAnalysis(strategy: Strategy, baseSettings: TransactionCostSettings): SensitivityResult`
- `compareBrokers(strategy: Strategy, brokers: BrokerConfig[]): BrokerComparisonResult`

**brokerPresets.ts**
- `getBrokerPresets(): BrokerConfig[]`
- `getBrokerById(id: string): BrokerConfig | undefined`

**costSettingsStore.ts**
- `useCostSettingsStore(): CostSettingsState`
- `savePreset(preset: CostSettingsPreset): void`
- `loadPreset(presetId: string): TransactionCostSettings`

### 修正関数

**RealisticBacktestEngine.ts**
- `constructor(config: Partial<BacktestConfig>)` - TransactionCostSettings対応
- `runBacktest(strategy: Strategy, symbol: string)` - ブローカー設定連携
- `calculateTransactionCosts(trades: Trade[])` - ブローカー設定による計算

## [Classes]
2つの新規クラスと1つの既存クラス拡張。

### 新規クラス

1. **`CostAnalysisService`**（`app/lib/backtest/CostAnalysisService.ts`）
   - 責務: コスト分析レポートの生成
   - メソッド:
     - `generateReport(result: BacktestResult, brokerConfig: BrokerConfig): CostAnalysisReport`
     - `calculateSensitivity(baseResult: BacktestResult, slippageRange: [number, number]): SensitivityResult`
     - `compareBrokerCosts(trades: Trade[], brokers: BrokerConfig[]): ComparisonResult`

2. **`CostSettingsManager`**（`app/lib/backtest/costSettingsStore.ts`）
   - 責務: コスト設定の永続化管理
   - メソッド:
     - `saveSettings(settings: TransactionCostSettings): void`
     - `loadSettings(): TransactionCostSettings`
     - `exportSettings(): string`（JSONエクスポート）
     - `importSettings(json: string): void`

### 既存クラス拡張

1. **`RealisticBacktestEngine`**
   - 新規プロパティ:
     - `brokerConfig: BrokerConfig`
     - `costSettings: TransactionCostSettings`
   - 拡張メソッド:
     - `setBrokerConfig(config: BrokerConfig): void`
     - `getCostBreakdown(): CostBreakdown`

## [Dependencies]
新規パッケージなし。既存のChart.jsとZustandを使用。

### 使用ライブラリ
- `chart.js` - コスト内訳グラフ表示（既存）
- `zustand` - 設定永続化（既存）
- `react-chartjs-2` - React Chart.js統合（既存）

### インポート関係
```
CostSettingsPanel
  ├── BrokerSelector
  ├── CostBreakdownChart
  └── useCostSettingsStore (Zustand)

CostImpactReport
  ├── CostBreakdownChart
  └── CostAnalysisService

RealisticBacktestEngine
  ├── CommissionCalculator
  └── BrokerConfig (型)
```

## [Testing]
単体テストと統合テスト、合計12個のテストケース。

### 新規テストファイル

1. **`app/lib/backtest/__tests__/CostAnalysisService.test.ts`**
   - コスト分析レポート生成のテスト
   - センシティビティ分析テスト
   - ブローカー比較テスト

2. **`app/components/backtest/__tests__/CostSettingsPanel.test.tsx`**
   - 設定パネル表示テスト
   - ブローカー選択テスト
   - 設定保存テスト

3. **`app/lib/backtest/__tests__/brokerPresets.test.ts`**
   - ブローカープリセット読み込みテスト
   - 手数料計算精度テスト

### 既存テスト修正

1. **`app/lib/backtest/__tests__/RealisticBacktestEngine.test.ts`**
   - ブローカー設定統合テスト追加
   - コスト内訳検証テスト追加

### テストカバレッジ目標
- 新規コード: 80%以上
- 修正箇所: 既存カバレッジを維持

## [Implementation Order]
段階的な実装で、依存関係を考慮した順序。

1. **型定義の追加**（30分）
   - `app/lib/backtest/types.ts`に新規型を追加
   - 既存型との互換性確認

2. **ブローカープリセット作成**（45分）
   - `app/lib/backtest/brokerPresets.ts`作成
   - 主要証券会社の手数料データ調査・設定

3. **コスト分析サービス実装**（90分）
   - `app/lib/backtest/CostAnalysisService.ts`作成
   - レポート生成ロジック実装
   - テスト作成（`CostAnalysisService.test.ts`）

4. **設定ストア実装**（45分）
   - `app/lib/backtest/costSettingsStore.ts`作成
   - Zustandストア実装
   - 永続化機能実装

5. **RealisticBacktestEngine拡張**（60分）
   - ブローカー設定連携
   - コスト内訳出力機能追加
   - テスト修正

6. **UIコンポーネント実装**（120分）
   - `BrokerSelector.tsx`（30分）
   - `CostSettingsPanel.tsx`（45分）
   - `CostBreakdownChart.tsx`（30分）
   - `CostImpactReport.tsx`（45分）

7. **インデックスファイル更新**（15分）
   - `app/components/backtest/index.ts`更新
   - `app/lib/backtest/index.ts`更新

8. **統合テスト**（45分）
   - コンポーネント統合テスト
   - E2Eテスト（該当箇所）

9. **ドキュメント更新**（30分）
   - README更新
   - APIドキュメント更新

**合計予定工数**: 約7時間

## 補足: 既存実装との統合ポイント

### RealisticBacktestEngineとの統合
```typescript
// 使用例
const engine = new RealisticBacktestEngine({
  ...config,
  brokerConfig: getBrokerById('sbi'),
  transactionCostsEnabled: true
});

const result = await engine.runBacktest(strategy, symbol);
const costReport = costAnalysisService.generateReport(result, brokerConfig);
```

### UI統合例
```tsx
// BacktestPanel内での使用
<CostSettingsPanel
  settings={costSettings}
  onChange={setCostSettings}
  brokers={getBrokerPresets()}
/>

{result && (
  <CostImpactReport report={costReport} />
)}
```
