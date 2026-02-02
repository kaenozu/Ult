# Position Sizing Calculator - UI Design & Usage

## UI Components Overview

### 1. Account Settings Panel (資金設定パネル)

Located in: **RightSidebar → "資金設定" Tab**

```
┌─────────────────────────────────────────────┐
│  資金管理設定                        [有効]  │
├─────────────────────────────────────────────┤
│                                             │
│  口座資金                                    │
│  [1000000                 ]                 │
│  現在の設定: ¥1,000,000                     │
│                                             │
│  1取引あたりのリスク率 (%)                   │
│  [━━━━━●━━━━]  [2.0]                       │
│  リスク金額: ¥20,000 (推奨: 1-2%)           │
│                                             │
│  最大ポジション比率 (%)                      │
│  [━━━━━●━━━━]  [20]                        │
│  最大ポジション: ¥200,000 (推奨: 10-20%)    │
│                                             │
│  ATR倍率（損切り距離）                       │
│  [━━━━━●━━━━]  [2.0]                       │
│  損切り距離: ATR × 2.0 (推奨: 2.0-2.5)      │
│                                             │
│  信頼度による調整                    [ON]    │
│                                             │
│  [    保存    ]  [リセット]                 │
│                                             │
│  ⚠️ 資金管理は取引成功の鍵です。           │
│     推奨設定を守り、リスクを抑えた         │
│     取引を心がけてください。               │
└─────────────────────────────────────────────┘
```

**Features:**
- Enable/Disable toggle at the top right
- Real-time calculation preview
- Slider + numeric input for precise control
- Visual feedback with color coding
- Warning message for risk awareness
- Save and Reset buttons

### 2. Position Sizing Display (ポジションサイズ表示)

Located in: **SignalPanel → シグナル Tab → Signal Card**

```
┌─────────────────────────────────────────────┐
│  📈 推奨ポジションサイズ                     │
├─────────────────────────────────────────────┤
│                                             │
│  ╔═══════════════════════════════╗          │
│  ║  推奨購入株数              🎯 ║          │
│  ║                                ║          │
│  ║       400 株                   ║          │
│  ║                                ║          │
│  ║  ポジション価値: ¥600,000      ║          │
│  ╚═══════════════════════════════╝          │
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ 💵 予想最大損失 │  │ ⚠️ 損切り距離  │  │
│  │                 │  │                 │  │
│  │   ¥20,000       │  │    3.33%        │  │
│  │                 │  │                 │  │
│  │  2.00% リスク   │  │  ¥50/株         │  │
│  └─────────────────┘  └─────────────────┘  │
│                                             │
│  ▼ 計算の詳細を表示                         │
│    │ エントリー価格: ¥1,500.00             │
│    │ 損切り価格: ¥1,450.00                 │
│    │ 損切り距離: ¥50.00 (3.33%)            │
│    │ 許容リスク額: ¥20,000 (口座資金の2%)  │
│    │ 基本推奨株数: 400株                   │
│    │ 信頼度: 75% (調整なし)                │
│    │ ポジション価値: ¥600,000              │
│    │ 予想最大損失: ¥20,000 (口座資金の2.00%)│
│    │ ✓ ポジション比率: 60.0% (健全)        │
│                                             │
│  ───────────────────────────────────────    │
│  口座資金: ¥1,000,000 | リスク許容: 2%      │
└─────────────────────────────────────────────┘
```

**Features:**
- Large, prominent display of recommended shares
- Color-coded risk indicators (red for loss, yellow for caution)
- Expandable details section
- Warning messages when applicable
- Current account settings footer

### 3. Warning States

#### Low Share Count Warning
```
┌─────────────────────────────────────────────┐
│  ⚠️ 注意事項                                │
│  • 推奨株数が最小単位未満です               │
│  • リスク許容度または口座資金を             │
│    見直してください                         │
└─────────────────────────────────────────────┘
```

#### High Position Concentration Warning
```
┌─────────────────────────────────────────────┐
│  ⚠️ 注意事項                                │
│  • ポジション比率が高すぎます (25.0%)       │
│  • 推奨上限: 20%                            │
└─────────────────────────────────────────────┘
```

#### Large Stop Loss Distance Warning
```
┌─────────────────────────────────────────────┐
│  ⚠️ 注意事項                                │
│  • 損切り距離が大きすぎます (8.5%)          │
│  • 推奨範囲: 3-5%                           │
└─────────────────────────────────────────────┘
```

## Usage Flow

### Step 1: Configure Account Settings

1. Navigate to **RightSidebar**
2. Click on **"資金設定"** tab
3. Enter your account equity (口座資金)
4. Adjust risk per trade percentage (1-2% recommended)
5. Optionally adjust max position % and ATR multiplier
6. Click **"保存"** to save settings

### Step 2: View Signal with Position Sizing

1. Select a stock from the watchlist
2. View the generated trading signal in **"シグナル"** tab
3. Position sizing is automatically calculated and displayed
4. Review:
   - Recommended number of shares
   - Expected maximum loss
   - Stop loss distance
   - Position value
5. Check for any warnings
6. Click **"計算の詳細を表示"** to see full reasoning

### Step 3: Make Informed Trading Decision

Based on the displayed information:
- ✅ If all values are within safe limits → Proceed with trade
- ⚠️ If warnings appear → Review and adjust settings or skip trade
- 📊 Use the detailed reasoning to understand the calculation

## UI States

### 1. Enabled & Data Available
- Full position sizing display with all metrics
- Interactive expandable details
- Color-coded indicators
- Warning badges if applicable

### 2. Disabled
```
┌─────────────────────────────────────────────┐
│  ポジションサイジング機能は無効です          │
│  設定から有効化してください                  │
└─────────────────────────────────────────────┘
```

### 3. Loading
```
┌─────────────────────────────────────────────┐
│  ▭▭▭▭▭▭▭▭ Loading...                       │
│  ▭▭▭▭▭ Loading...                          │
│  ▭▭▭▭▭▭▭▭ Loading...                       │
└─────────────────────────────────────────────┘
```

### 4. Error / No Data
```
┌─────────────────────────────────────────────┐
│  ポジションサイズを計算できません            │
│  シグナルまたは価格データが不足しています    │
└─────────────────────────────────────────────┘
```

## Color Scheme

Following the existing dark theme:

- **Background**: `#141e27` (dark blue-gray)
- **Secondary Background**: `#192633` (slightly lighter)
- **Border**: `#233648` (subtle border)
- **Text Primary**: `white`
- **Text Secondary**: `#92adc9` (muted blue)
- **Primary Color**: `primary` (blue accent)
- **Success**: `green-500` (for positive indicators)
- **Warning**: `yellow-400` (for caution)
- **Danger**: `red-400` (for risk/loss)

## Icons

Using Lucide React icons:
- 📈 `TrendingUp` - Position sizing header
- 🎯 `Target` - Recommended shares
- 💵 `DollarSign` - Maximum loss
- ⚠️ `AlertTriangle` - Warnings & stop loss

## Responsive Behavior

- **Desktop**: Full width in RightSidebar (w-80)
- **Mobile**: Collapsible sidebar, full screen when open
- **Tablet**: Optimized spacing and font sizes

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels for screen readers
- ✅ Sufficient color contrast (WCAG AA)
- ✅ Clear focus indicators
- ✅ Semantic HTML structure

## Integration Points

1. **RightSidebar**: New "資金設定" tab added
2. **SignalCard**: Position sizing display integrated after target/stop loss section
3. **RiskManagementStore**: Zustand store with LocalStorage persistence
4. **PredictiveAnalyticsEngine**: Core calculation logic

## Example Scenarios

### Conservative Trader
- Account: ¥1,000,000
- Risk: 1%
- Result: Smaller positions, maximum safety

### Aggressive Trader
- Account: ¥5,000,000
- Risk: 3%
- Result: Larger positions, higher potential returns (and risks)

### Beginner
- Account: ¥500,000
- Risk: 1.5%
- Result: Educational warnings guide safe trading

All scenarios provide clear, actionable information with appropriate warnings and guidance.
