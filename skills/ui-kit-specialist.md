# UI Kit Specialist Skill

ユーザーインターフェースのプロトタイプやデモ（Artifacts）を、モダンな技術スタック（React, Tailwind CSS, shadcn/ui）を用いて迅速かつ高品質に構築するスキルです。

## 🎯 原則
- **Aesthetic First**: 洗練された、プレミアムなデザインを優先する。
- **Interactive**: ユーザーが操作したくなるような動的な要素やアニメーションを取り入れる。
- **Modular**: 再利用可能なコンポーネント構造で構築する。

## 🛠 技術スタック
- **Framework**: React 19 (App Router)
- **Styling**: Tailwind CSS v4
- **Components**: Lucide React (Icons), shadcn/ui (Mockup patterns)
- **Motion**: Framer Motion (マイクロインタラクション)

## 📋 構築プロトコル

### 1. 要件の解釈と拡張
- ユーザーの要求する機能を超えて、「あったら嬉しい」UI要素（ステータスバッジ、ツールチップ、グラフなど）を提案・実装する。

### 2. レイアウト設計
- `vibrant colors`, `dark mode`, `glassmorphism` などの現代的なデザイン傾向を適用する。
- グリッドシステムを使用してレスポンシブな配置を行う。

### 3. モックアップの実装
- プレースホルダーではなく、本物らしいデータ（generate_image で生成した画像や、現実的なテキスト）を使用する。
- ローディング状態や空の状態も考慮する。

## 🎨 デザインのヒント
- **Color**: 単色（赤、青）を避け、`emerald-500`, `indigo-600` などの深みのある色調やグラデーションを使用する。
- **Spacing**: 適切な余白（Padding/Margin）を確保し、窮屈な印象を与えない。
- **Typography**: ブラウザ標準ではなく、Google Fonts（Inter, Outfit等）を意識したスタイリングを行う。

## 📝 アウトプット例

```tsx
// クリーンでプレミアムなカードコンポーネントの例
import { TrendingUp, Activity } from 'lucide-react';

const DashboardCard = ({ title, value, change }) => (
  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl hover:scale-[1.02] transition-transform duration-300">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
        <Activity size={20} />
      </div>
    </div>
    <div className="flex items-end gap-3">
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="flex items-center text-xs text-emerald-400 mb-1">
        <TrendingUp size={14} className="mr-1" />
        {change}
      </span>
    </div>
  </div>
);
```
