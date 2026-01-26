# UI/UX Improver

ユーザーインターフェースとユーザー体験の改善を専門とするスキル。

## スキルの目的

ユーザーからのフィードバック（「見づらい」「使いにくい」など）に基づいて、UI/UXの問題を特定し、迅速に改善する。

## 使用タイミング

ユーザーから以下のフィードバックがあった場合：
- 「見づらい」「見えない」
- 「使いにくい」「操作しにくい」
- 「何だか変」「おかしい」
- その他UI/UXに関する問題

## 改善アプローチ

### 1. 問題の分類

#### 視認性の問題
- **色のコントラスト不足**: テキスト、線、ボーダーの色が背景と区別しにくい
- **サイズが小さすぎ/大きすぎ**: フォント、線、アイコンのサイズが適切でない
- **密度が高すぎ/低すぎ**: 情報が詰め込みすぎ、または余白が多すぎる
- **塗りつぶしが不要**: fill設定により重要な情報が隠れている

#### 読み取りの問題
- **スケールが不適切**: Y軸の範囲が広すぎ/狭すぎて変化が見えない
- **予測範囲が非現実的**: 予測コーンなどが現実離れした範囲を表示

### 2. 改善手順

```bash
# 1. 現在のコードを確認
# 定数ファイル: app/constants/
# コンポーネント: app/components/

# 2. 問題に応じて調整
```

#### 色の調整パターン
```typescript
// メインカラー: 控えめな色を選択
const MAIN_COLOR = '#67e8f9'; // cyan-300（薄く控えめ）

// 高コントラストが必要な場合
const HIGH_CONTRAST = '#06b6d4'; // cyan-500

// 透明度調整
const SUBTLE = 'rgba(35, 54, 72, 0.5)';  // 控えめ
const VISIBLE = 'rgba(35, 54, 72, 0.8)'; // はっきり見える
```

#### サイズの調整パターン
```typescript
// 線の太さ
const THIN = 1;    // 補助線
const NORMAL = 2;  // 通常線
const THICK = 3;   // 強調線

// フォントサイズ
const SMALL = 10;
const NORMAL = 12;
const LARGE = 14;
```

#### 塗りつぶしの制御
```typescript
// チャート等で塗りつぶしが不要な場合
{
  fill: false,  // 塗りつぶしなし
  // backgroundColor は削除
}
```

#### スケール調整（チャート等）
```typescript
// Y軸範囲を現在価格中心に設定
const yAxisRange = {
  min: currentPrice - adjustedRange / 2,
  max: currentPrice + adjustedRange / 2,
};
```

#### 予測範囲の現実化
```typescript
// 予測誤差の影響を制限
const errorFactor = Math.min(Math.max(predictionError, 0.5), 1.5);

// 信頼度に基づく不確実性
const confidenceUncertainty = 0.4 + ((100 - confidence) / 100) * 0.4;
const combinedFactor = errorFactor * confidenceUncertainty;
```

### 3. 検証

変更後は必ずブラウザで確認：
```bash
# 開発サーバーが起動しているか確認
cd trading-platform && npm run dev

# Chrome DevTools MCPで確認
# - ページをリロード
# - スクリーンショットを撮影
# - コンソールエラーをチェック
```

## 一般原則

1. **控えめなデザイン**: 主張しすぎない色、サイズを選択
2. **情報の階層化**: 重要な情報を目立たせ、補助情報は控えめに
3. **現実的な範囲**: 予測、スケール等は現実的な値を使用
4. **ユーザーフィードバック優先**: ユーザーが「見づらい」と言えば見づらい

## 関連ファイル

- `app/constants/chart.ts`: チャート関連の定数
- `app/constants/ui.ts`: UI全般の定数
- `app/components/*.tsx`: 各コンポーネント
