# 次の作業プロンプト

**日付**: 2026-02-07  
**タスク**: コード修正実行

---

## 🎯 目的

全ソースコードレビューで見つかった11のESLint警告と2つのバグを修正する。

---

## 📋 修正対象一覧

### 🔴 P0 - 今日中に完了

1. **RiskManagementService.validateOrder() の修正**
   - ファイル: `app/lib/services/RiskManagementService.ts`
   - 行番号: 101-117
   - 問題: `order.riskConfig` が正しく処理されていない可能性
   - 作業:
     ```bash
     # 1. 現在の実装を確認
     read app/lib/services/RiskManagementService.ts (line 101-117)
     
     # 2. ロジックを分析
     # - order.riskConfig が null/undefined 인지 확인
     # - デフォルト値とのマージ処理を確認
     # - UI設定が反映されているか検証
     
     # 3. 必要に応じて修正
     ```

2. **Lint設定の修正**
   - ファイル: `trading-platform/package.json`
   - 行番号: 15-16
   - 作業:
     ```bash
     # package.json の lint コマンドから --ignore-pattern "app/lib/**" を削除
     # 修正後: npm run lint ですべてのコードをチェック
     ```

3. **useBacktestControls.ts の依存関係修正**
   - ファイル: `app/components/SignalPanel/hooks/useBacktestControls.ts`
   - 行番号: 56
   - 作業: 複雑な条件式を別変数化 + ohlcvを依存に追加

---

### 🟡 P1 - 今週中に完了

4. **useSymbolAccuracy.ts の依存関係修正**
   - ファイル: `app/hooks/useSymbolAccuracy.ts`
   - 行番号: 203
   - 作業: ohlcvを依存に追加 + 条件式を別変数化

5. **StockChart.tsx の不要な依存削除**
   - ファイル: `app/components/StockChart/StockChart.tsx`
   - 行番号: 187-199
   - 作業: `forecastExtension.forecastPrices.length` を削除

6. **performance.ts の3つの警告修正**
   - ファイル: `app/lib/performance.ts`
   - 行番号: 185, 209, 252
   - 作業: ref値のクロージャ保存、Missing dependency修正、不要依存削除

7. **エラーハンドリングの型安全化**
   - 対象: 約15ファイル
   - 作業: `catch (error: unknown)` に変更

---

## 🚀 開始プロンプト

```
次のコード修正を行ってください。

## 背景
ULT Trading Platformの全ソースコードレビューを実施しました。
11件のESLint警告と2件のバグが見つかりました。

## 修正優先順位
1. 🔴 P0: RiskManagementService.validateOrder() の確認・修正
2. 🔴 P0: package.json の lint 設定修正
3. 🔴 P0: useBacktestControls.ts の依存関係修正
4. 🟡 P1: useSymbolAccuracy.ts の依存関係修正
5. 🟡 P1: StockChart.tsx の不要な依存削除
6. 🟡 P1: performance.ts の3つの警告修正
7. 🟡 P1: エラーハンドリングの型安全化（約15ファイル）

## 修正手順
1. 各ファイルをreadで確認
2. 問題箇所を特定
3. 修正コードを作成
4. editで修正
5. npm run lint で検証
6. npm test でテスト実行

## 期待される結果
- ESLint警告: 11件 → 0件
- TypeScriptエラー: 0件（維持）
- パフォーマンスの向上
- 型安全性の強化

修正を開始してください。
```

---

## 📝 修正後の検証手順

```bash
# 1. TypeScriptチェック
cd trading-platform
npx tsc --noEmit

# 2. Lintチェック
npm run lint

# 3. テスト実行
npm test

# 4. ビルド確認
npm run build
```

---

## 🎯 成功基準

- [ ] `npm run lint` → 0エラー 0警告
- [ ] `npx tsc --noEmit` → 0エラー
- [ ] `npm test` → 全テスト通過
- [ ] `npm run build` → 成功

---

**文書作成者**: opencode  
**作成日**: 2026-02-07  
**更新日**: ____/____/____
