# UI Changes - Japanese Market Data Gap Fix

## Overview
This document shows the visual changes implemented to address the Japanese market intraday data gap issue.

## 1. Chart Toolbar - Normal State (Daily Data)

When a Japanese stock is displayed with daily data (interval = 'D'), the user sees:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 7203  トヨタ自動車  [遅延20分]                                            │
│                                                                          │
│ [1m] [5m] [15m] [1H] [4H] [D*]  |  [SMA] [BB]  |  インジケーター ツール │
│                                                                          │
│ 始: ¥3,580  高: ¥3,600  安: ¥3,550  終: ¥3,590                         │
└──────────────────────────────────────────────────────────────────────────┘

Legend:
- [遅延20分] = Orange badge with clock icon
- [D*] = Active interval button (blue/primary color)
- Grayed out buttons = [1m] [5m] [15m] [1H] [4H] (disabled for Japanese stocks)
```

### Badge Details:
- **Color**: Orange background (bg-orange-500/10)
- **Border**: Orange (border-orange-500/20)
- **Icon**: Clock icon from lucide-react
- **Text**: "遅延20分" (20 minute delay)
- **Tooltip**: "Japanese market data has a 20 minute delay due to data provider limitations"

## 2. Chart Toolbar - Fallback State (Intraday Attempted)

When a user attempts to select an intraday interval (1m, 5m, 15m, 1H, 4H) for a Japanese stock:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 7203  トヨタ自動車  [遅延20分] [⚠ 日足のみ]                              │
│                                                                          │
│ [1m] [5m] [15m] [1H] [4H] [D*]  |  [SMA] [BB]  |  インジケーター ツール │
│                                                                          │
│ 始: ¥3,580  高: ¥3,600  安: ¥3,550  終: ¥3,590                         │
└──────────────────────────────────────────────────────────────────────────┘

Legend:
- [遅延20分] = Orange delay badge (same as above)
- [⚠ 日足のみ] = Yellow warning badge with triangle icon
- [D*] = Active interval button (forced to daily)
- Grayed out buttons = All intraday buttons disabled
```

### Warning Badge Details:
- **Color**: Yellow background (bg-yellow-500/10)
- **Border**: Yellow (border-yellow-500/20)
- **Icon**: Warning triangle icon
- **Text**: "日足のみ" (Daily data only)
- **Tooltip**: "分足データが利用できないため、日足データを表示しています"
  (Intraday data is not available, displaying daily data instead)

## 3. US Stock (No Badge)

For US stocks, no badge is shown:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ AAPL  Apple Inc.                                                         │
│                                                                          │
│ [1m*] [5m] [15m] [1H] [4H] [D]  |  [SMA] [BB]  |  インジケーター ツール │
│                                                                          │
│ 始: $185.50  高: $186.20  安: $184.80  終: $185.90                       │
└──────────────────────────────────────────────────────────────────────────┘

Legend:
- No delay badge for US stocks
- All interval buttons enabled
- [1m*] = Active intraday interval
```

## 4. Badge Component Specifications

### DataDelayBadge Component

**Props:**
```typescript
interface DataDelayBadgeProps {
  market: 'japan' | 'usa';           // Only shows for 'japan'
  fallbackApplied?: boolean;         // Shows warning badge if true
  delayMinutes?: number;             // Delay time (default: 20)
  size?: 'sm' | 'md';                // Size variant
  className?: string;                // Additional CSS classes
}
```

**Size Variants:**
- **Small (`sm`)**: text-[10px], px-1.5, py-0.5, icon size 10px
- **Medium (`md`)**: text-xs, px-2, py-1, icon size 12px

**Colors:**
- **Delay Badge**: Orange (#f97316)
- **Warning Badge**: Yellow (#eab308)

## 5. Responsive Behavior

On smaller screens, badges wrap naturally:

```
Mobile (< 768px):
┌────────────────────────┐
│ 7203  トヨタ自動車      │
│ [遅延20分] [日足のみ]   │
│                        │
│ [1m] [5m] [15m]        │
│ [1H] [4H] [D*]         │
│                        │
│ [SMA] [BB]             │
└────────────────────────┘
```

## 6. Interaction States

### Disabled Intraday Buttons
When hovering over disabled intraday buttons for Japanese stocks:
- **Cursor**: `cursor-not-allowed`
- **Color**: `text-[#92adc9]/30` (30% opacity)
- **Tooltip**: "日本株では日足データのみ利用可能です"

### Active State
When an intraday button is selected but fallback to daily is applied:
- Button shows as active (blue/primary color)
- But data displayed is daily
- Warning badge appears to indicate fallback

## 7. API Response Example

When the API returns data with fallback:

```json
{
  "data": [...],
  "warning": "Note: Intraday data (1m, 5m, 15m, 1h, 4H) is not available for Japanese stocks. Daily data is shown instead.",
  "metadata": {
    "isJapaneseStock": true,
    "dataDelayMinutes": 20,
    "interval": "1d",
    "requestedInterval": "1m",
    "fallbackApplied": true
  }
}
```

## 8. Accessibility

### ARIA Attributes
- Interval buttons: `aria-pressed="true|false"`
- Disabled buttons: `disabled` attribute
- Badges: Proper `title` attributes for tooltips

### Screen Reader Support
- Badges include descriptive text
- Disabled state is announced
- Warning messages are accessible

## 9. Implementation Files

**Modified:**
- `app/api/market/route.ts` - API metadata
- `app/components/ChartToolbar.tsx` - Badge integration
- `app/hooks/useStockData.ts` - Metadata tracking
- `app/page.tsx` - Props passing

**New:**
- `app/components/DataDelayBadge.tsx` - Badge component
- `app/components/__tests__/DataDelayBadge.test.tsx` - Tests
- `app/api/market/__tests__/japanese-fallback.test.ts` - API tests

## 10. Visual Hierarchy

The badges are positioned to be noticeable but not overwhelming:

```
Priority Order:
1. Stock Symbol (7203) - Bold, largest
2. Stock Name (トヨタ自動車) - Regular, smaller
3. Badges ([遅延20分] [日足のみ]) - Small, colored, informative
4. Interval Buttons - Interactive controls
5. Price Data - Supplementary information
```

## 11. Color Palette

**Orange (Delay Badge):**
- Background: `bg-orange-500/10` (rgba(249, 115, 22, 0.1))
- Text: `text-orange-500` (#f97316)
- Border: `border-orange-500/20` (rgba(249, 115, 22, 0.2))

**Yellow (Warning Badge):**
- Background: `bg-yellow-500/10` (rgba(234, 179, 8, 0.1))
- Text: `text-yellow-500` (#eab308)
- Border: `border-yellow-500/20` (rgba(234, 179, 8, 0.2))

## 12. Future Enhancements

See `docs/JAPANESE_MARKET_DATA_ENHANCEMENT_ROADMAP.md` for:
- playwright_scraper integration
- Real-time data fetching from Yahoo Finance Japan
- WebSocket streaming for live updates
- Swing trading mode optimizations
