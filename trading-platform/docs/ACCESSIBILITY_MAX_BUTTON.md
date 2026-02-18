# OrderPanel Max Button - Accessibility Improvements

## 概要

PR #938で実装されたOrderPanelの「最大 (Max)」ボタンのアクセシビリティ改善に関するドキュメント。

## 背景

以前の実装では、資金が不足している場合、Maxボタンに`disabled`属性が設定されていました。これにより、キーボードユーザーはボタンにフォーカスできず、資金不足の理由を説明するツールチップを見ることができませんでした。

## 実装された改善

### 1. `disabled` → `aria-disabled` への変更

**変更前:**
```tsx
<button disabled={!canAfford}>
  最大 (Max)
</button>
```

**変更後:**
```tsx
<button aria-disabled={!canAfford}>
  最大 (Max)
</button>
```

**理由:** `aria-disabled`を使用することで、ボタンは視覚的に無効化されているように見えますが、キーボードでフォーカス可能な状態を保ちます。

### 2. キーボードアクセシブルなツールチップ

**追加された機能:**
- `onFocus` ハンドラー: キーボードでボタンにフォーカスした時にツールチップを表示
- `onBlur` ハンドラー: フォーカスが外れた時にツールチップを非表示

```tsx
onFocus={() => !canAfford && setShowTooltip(true)}
onBlur={() => setShowTooltip(false)}
```

### 3. セマンティックな関連付け

**追加された属性:**
- `aria-describedby`: ツールチップのIDを参照し、スクリーンリーダーがボタンとツールチップの関係を理解できるようにします

```tsx
aria-describedby={!canAfford ? tooltipId : undefined}
```

ツールチップ側:
```tsx
<div id={tooltipId} role="tooltip">
  {MSG_INSUFFICIENT_FUNDS}
</div>
```

### 4. 視覚的なフォーカスインジケーター

**追加されたスタイル:**
```tsx
className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm"
```

これにより、キーボードナビゲーション時に明確なフォーカスリングが表示されます。

### 5. インタラクション動作の改善

**クリック時の動作:**
```tsx
onClick={() => {
  if (canAfford) {
    onSetQuantity(maxQty);
  } else {
    setShowTooltip(true);
  }
}}
```

無効化されている場合でもクリック可能で、ツールチップを表示して理由を説明します。

## アクセシビリティの利点

1. **キーボードナビゲーション:** Tabキーでボタンにフォーカスできます
2. **スクリーンリーダー対応:** `aria-disabled`と`aria-describedby`により、状態と理由を読み上げ
3. **視覚的フィードバック:** フォーカスリングにより、現在の位置が明確
4. **コンテキスト情報:** ツールチップで資金不足の理由を表示

## テストカバレッジ

### ユニットテスト (15テスト)

`OrderPanel_MaxButton_A11y.test.tsx` で以下をテスト:

#### 資金が十分な場合:
- ✅ ボタンがクリック可能で数量を設定
- ✅ `aria-disabled="false"` 属性
- ✅ フォーカス時にツールチップが表示されない

#### 資金が不足している場合:
- ✅ `disabled` 属性がない（キーボードフォーカス可能）
- ✅ `aria-disabled="true"` 属性
- ✅ キーボードでフォーカス可能
- ✅ フォーカス時にツールチップが表示
- ✅ ブラー時にツールチップが非表示
- ✅ `aria-describedby` がツールチップIDにリンク
- ✅ マウスホバー時にツールチップが表示
- ✅ フォーカスリングスタイルが適用
- ✅ クリック時にツールチップが表示（数量は変更されない）

#### エッジケース:
- ✅ 現金が0の場合の処理
- ✅ 価格が0の場合の処理

### テスト結果

```bash
$ npm test -- OrderPanel_MaxButton_A11y.test.tsx

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

全てのテストが合格しています。

## WCAG 2.1 準拠

この実装は以下のWCAG 2.1ガイドラインに準拠しています:

- **2.1.1 Keyboard (Level A):** 全ての機能がキーボードで操作可能
- **2.4.7 Focus Visible (Level AA):** フォーカスインジケーターが明確に表示
- **4.1.2 Name, Role, Value (Level A):** ARIA属性により状態と役割が明確

## コンポーネントの使用例

```tsx
<MaxQuantityButton
  price={2000}
  cash={1000000}
  onSetQuantity={(qty) => setQuantity(qty)}
/>
```

## 関連ファイル

- `trading-platform/app/components/OrderPanel.tsx` - メインコンポーネント
- `trading-platform/app/components/__tests__/OrderPanel_MaxButton_A11y.test.tsx` - アクセシビリティテスト
- `trading-platform/app/components/__tests__/OrderPanel.test.tsx` - 基本的な機能テスト
- `trading-platform/app/components/__tests__/OrderPanel_Max.test.tsx` - Max機能テスト

## 参考資料

- [ARIA: disabled state](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-disabled)
- [ARIA: aria-describedby](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-describedby)
- [WCAG 2.1 Understanding Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)

---

**最終更新:** 2026-02-18  
**実装:** PR #938 (マージ済み)  
**検証:** 完了
