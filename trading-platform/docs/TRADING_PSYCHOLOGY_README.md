# Trading Psychology Features (TRADING-025)

## 概要

TRADING-025では、トレーダーの心理的バイアスを認識・管理するための機能を実装し、感情取引を防止して勝率を向上させます。

## 主要機能

### 1. 心理的バイアス検出

以下のバイアスを自動検出します：

- **FOMO (Fear of Missing Out)**: 短時間に複数の取引を検出
- **恐怖バイアス**: 連続損失後の早すぎた利益確定
- **確認バイアス**: 損失ポジションの長期保有
- **損失嫌悪**: 損失ポジション銘柄への追加投資
- **過度取引**: 1日5取引以上の検出

### 2. クーリングオフタイマー

連続損失や過度取引時に強制的な休憩を設定：

- **自動トリガー**:
  - 連続損失3回以上
  - 日次損失限度5%到達
  - 週次損失限度10%到達
  - 1日5取引以上
  
- **クーリング期間**: 重症度に応じて30分〜24時間

### 3. 規律スコア計算

5つの観点からトレーダーの規律を評価（0-100点）：

| 項目 | 配点 | 評価基準 |
|------|------|----------|
| 計画遵守 | 30点 | 計画通り取引した割合（70%以上で満点） |
| 感情コントロール | 20点 | 冷静な取引の割合（平均感情スコア7/10以上で満点） |
| 損失管理 | 20点 | 連続損失回数（1回以下で満点） |
| ジャーナル記録 | 10点 | 反省・メモ記録率（80%以上で満点） |
| クーリングオフ遵守 | 20点 | クーリング期間を守った割合（90%以上で満点） |

### 4. 取引メモ・感情ログ

`JournalEntry`に以下のフィールドが追加されました：

```typescript
{
  tradePlan?: {
    strategy: string;
    entryReason: string;
    targetPrice?: number;
    stopLoss?: number;
  };
  emotionBefore?: {
    fear: number;      // 1-5
    greed: number;     // 1-5
    confidence: number; // 1-5
    stress: number;    // 1-5
  };
  emotionAfter?: { ... };
  reflection?: {
    lessonsLearned?: string;
    whatWorked?: string;
    whatDidntWork?: string;
    improvementAreas?: string[];
  };
  followedPlan?: boolean;
  biasDetected?: string[];
}
```

### 5. トレーディングカレンダー

日次で以下を記録：

- 取引回数
- 損益
- 感情スコア
- 規律スコア
- 違反の有無
- クーリングオフ状態

## 使い方

### React Hook

```typescript
import { usePsychology } from '@/app/hooks/usePsychology';

function TradingComponent() {
  const {
    alerts,
    disciplineScore,
    currentCooldown,
    recentAlerts,
    
    recordTrade,
    analyzeBias,
    canTrade,
    calculateDisciplineScore,
    identifyImprovements,
    startManualCooldown
  } = usePsychology();

  // 取引前のチェック
  const handleTradeAttempt = (order) => {
    const tradeCheck = canTrade();
    if (!tradeCheck.allowed) {
      alert(tradeCheck.reason);
      return;
    }

    // バイアス分析
    const biasAnalysis = analyzeBias(order);
    if (biasAnalysis.detectedBiases.length > 0) {
      console.warn('Biases detected:', biasAnalysis.detectedBiases);
    }

    // 取引実行
    recordTrade(order);
  };

  // 規律スコアの計算
  useEffect(() => {
    const score = calculateDisciplineScore();
    console.log('Discipline score:', score.overall);
  }, []);

  return (
    <div>
      {currentCooldown && (
        <div className="alert alert-warning">
          クーリングオフ期間中: {currentCooldown.reason.type}
        </div>
      )}
      
      {recentAlerts.map(alert => (
        <div key={alert.timestamp.toString()} className={`alert alert-${alert.severity}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
}
```

### Services直接使用

```typescript
import { PsychologyMonitor } from '@/app/lib/risk/PsychologyMonitor';
import { CoolingOffManager } from '@/app/lib/risk/CoolingOffManager';
import { DisciplineScoreCalculator } from '@/app/lib/psychology/DisciplineScoreCalculator';

// PsychologyMonitor
const monitor = new PsychologyMonitor();
monitor.startSession();
monitor.recordTrade(order);

const biasAnalysis = monitor.detectBiases(order);
const consecutiveLosses = monitor.detectConsecutiveLosses(history);
const alerts = monitor.generatePsychologyAlerts();

// CoolingOffManager
const coolingManager = new CoolingOffManager({
  consecutiveLossThreshold: 3,
  maxTradesPerDay: 5
});

const cooldown = coolingManager.enforceCoolingOff({
  type: 'consecutive_losses',
  severity: 5,
  triggerValue: 3
});

const canTrade = coolingManager.canTrade();
if (!canTrade.allowed) {
  console.log('Cooling off:', canTrade.reason);
}

// DisciplineScoreCalculator
const calculator = new DisciplineScoreCalculator();
const score = calculator.calculateDisciplineScore(journalEntries, cooldownRecords);
const improvements = calculator.identifyImprovementAreas(score);
```

### Zustand Store

```typescript
import { usePsychologyStore } from '@/app/store/psychologyStore';

// アラート管理
const { alerts, addAlert, clearAlerts } = usePsychologyStore();

addAlert({
  type: 'fomo',
  severity: 'high',
  message: 'FOMO detected',
  recommendation: 'Take a break',
  timestamp: new Date()
});

// 取引計画
const { tradePlans, addTradePlan, getTradePlan } = usePsychologyStore();

addTradePlan({
  id: 'plan-1',
  symbol: 'AAPL',
  strategy: 'Breakout',
  entryReason: 'Support confirmed',
  targetPrice: 200,
  stopLoss: 180,
  riskRewardRatio: 2,
  positionSize: 100,
  createdAt: new Date()
});

// 反省ログ
const { addReflection, getReflection } = usePsychologyStore();

addReflection({
  tradeId: 'trade-1',
  lessonsLearned: 'Patience is key',
  whatWorked: 'Entry timing',
  whatDidntWork: 'Exit too early',
  emotionalState: {
    fear: 2,
    greed: 3,
    confidence: 4,
    stress: 2,
    overall: 2.75
  },
  wouldDoAgain: true,
  improvementAreas: ['Better exit strategy'],
  createdAt: new Date()
});
```

## アーキテクチャ

```
app/
├── lib/
│   ├── risk/
│   │   ├── PsychologyMonitor.ts        # 心理監視サービス
│   │   └── CoolingOffManager.ts        # クーリングオフ管理
│   └── psychology/
│       └── DisciplineScoreCalculator.ts # 規律スコア計算
├── store/
│   └── psychologyStore.ts              # Zustand状態管理
├── hooks/
│   └── usePsychology.ts                # React Hook
└── types/
    ├── index.ts                         # JournalEntry拡張
    └── risk.ts                          # 心理関連型定義
```

## テスト

```bash
# 全テスト実行
npm test

# 個別テスト
npm test PsychologyMonitor.test.ts
npm test CoolingOffManager.test.ts
npm test DisciplineScoreCalculator.test.ts
npm test psychologyStore.test.ts
```

## 成功基準

### 短期的目標（1ヶ月）

- ✅ 連続損失最大回数: 2回以下
- ✅ 感情スコア平均: 7/10以上
- ✅ 取引計画遵守率: 70%以上
- ✅ クーリングオフ利用率: 90%以上

### 中期的目標（3ヶ月）

- ✅ 過度取引発生率: 1%以下
- ✅ 最大連続損失回数: 1回
- ✅ 感情スコア平均: 8/10以上
- ✅ 取引計画遵守率: 80%以上

## 制限事項と今後の改善

### 現在の制限事項

1. **簡易的な損益判定**: 
   - 現在の実装では、BUY注文を損失、SELL注文を利益として簡易判定しています
   - 実際の損益は`JournalEntry`の`profit`フィールドを使用する必要があります
   - 今後、実際の損益データと統合する予定です

2. **恐怖バイアス検出**: 
   - 保有時間の計算が未実装のため、連続損失後の売却を恐怖バイアスとして検出しています
   - 実際の保有時間データと統合して、より正確な検出を行う予定です

3. **Date型のシリアライゼーション**:
   - 現在、alertsのtimestampのみがISO文字列に変換されます
   - その他のDate型フィールドも適切に処理する必要があります

### 推奨される使用方法

実際の損益データを使用する場合は、以下のように`JournalEntry`を作成してください：

```typescript
const entry: JournalEntry = {
  id: 'trade-1',
  symbol: 'AAPL',
  date: '2024-01-01',
  signalType: 'BUY',
  entryPrice: 150,
  exitPrice: 160,  // 実際の終値
  quantity: 10,
  profit: 100,     // 実際の損益を必ず記録
  profitPercent: 6.67,
  status: 'CLOSED',
  // ... psychology fields
};
```

## 依存関係

- TRADING-016: 取引心理学と行動ファイナンス分析システムの実装
- TRADING-003: リスク管理システムの高度化

## 参考資料

- docs/RISK_MANAGEMENT_README.md
- docs/NLP_SENTIMENT_ANALYSIS.md
