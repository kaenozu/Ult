# Stability Master (スタビリティ・マスター)

`stability-master` は、アプリケーションの堅牢性、型安全性、およびテスト環境の健全性を維持・向上させるための専門スキルです。
レビューレポートやエラーログに基づき、システム的な弱点を特定し、コードベースを「壊れにくい」状態へ導きます。

## コア・コンピテンシー

1.  **メモリリーク・防衛**
    *   非同期処理（`fetch`, `Promise`）には必ず `AbortSignal` を実装し、コンポーネントのアンマウント時にキャンセル可能にする。
    *   `useEffect` のクリーンアップ関数を徹底する。
    *   "Can't perform a React state update on an unmounted component" 警告を根絶する。

2.  **型安全性・強化 (Type Hardening)**
    *   `any` や `unknown` の使用を監視し、具体的なインターフェースや型定義（`Record<string, unknown>` 等）に置き換える。
    *   外部ライブラリ（Chart.js等）の型定義を最大限活用し、独自インターフェースでラップして安全性を確保する。
    *   エラーハンドリングにおける型ガード（`isAPIError` 等）を導入する。

3.  **エラー・レジリエンス (Error Resilience)**
    *   APIエラーや計算失敗時に、単に `console.error` するだけでなく、UI上に適切なフィードバック（エラーステート、トースト、代替表示）を提供する。
    *   例外が発生してもアプリ全体がクラッシュしないよう、境界（Error Boundary）やフォールバック処理を実装する。

4.  **テスト環境・衛生管理 (Test Hygiene)**
    *   ユニットテスト（Jest）とE2Eテスト（Playwright）の責務と実行範囲を明確に分離する（`testPathIgnorePatterns` 等の設定）。
    *   テスト実行時のコンフリクトや環境汚染を防ぐ設定を維持する。

5.  **セキュリティ・ドキュメンテーション**
    *   `.env` ファイルやドキュメントにおける機密情報の取り扱い（`NEXT_PUBLIC_` の有無など）を厳格にチェックし、誤解を招く記述を修正する。

## 行動指針

*   **Evidence-Based**: 修正を行う際は、必ずレビューレポート、ログ、または具体的なコードパターン（`grep` 結果）に基づく。
*   **Atomic Refactoring**: リファクタリングは機能単位で小さく行い、それぞれ独立したブランチとPRを作成する。
*   **User-Centric**: 内部エラーであっても、最終的にユーザーがどう認識するか（UI表示）まで考慮して修正する。

## ワークフロー例

```bash
# 1. 脆弱性の特定
grep -r "any" src/
grep -r "useEffect" src/ # クリーンアップ確認

# 2. 修正用ブランチ作成
git checkout -b fix/memory-leak-component-name

# 3. 修正と検証
npm run build
npm test

# 4. PR作成
gh pr create --title "fix: implement abort signal to prevent memory leaks"
```
