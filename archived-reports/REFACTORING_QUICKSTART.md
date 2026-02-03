# リファクタリングロードマップ - クイックスタートガイド

このガイドでは、リファクタリング統合ロードマップを効率的に実装するための手順を説明します。

---

## 📋 開始前のチェックリスト

- [ ] `REFACTORING_ROADMAP_TRACKING.md` を読み、全体像を把握
- [ ] 作業するPhaseとIssueを決定
- [ ] 関連するIssueテンプレート（`docs/refactoring-issues/` 内）を確認
- [ ] 開発環境のセットアップ完了

---

## 🚀 実装フロー

### ステップ1: 準備

```bash
# リポジトリのクローン（既にある場合はスキップ）
cd /path/to/Ult/trading-platform

# 依存関係のインストール
npm install

# ビルド確認
npm run build

# テスト実行
npm test
```

### ステップ2: ブランチ作成

```bash
# 作業用ブランチの作成（Issue番号を含める）
git checkout -b refactor/issue-522-constants
```

### ステップ3: 実装

Issueテンプレートの「タスクリスト」に従って実装を進めます。

**推奨アプローチ**:
1. **小さく始める**: 最小限の変更から
2. **頻繁にテスト**: 各変更後にテスト実行
3. **段階的コミット**: 意味のある単位でコミット
4. **ドキュメント更新**: 変更内容を記録

### ステップ4: テストと検証

```bash
# TypeScript型チェック
npx tsc --noEmit

# リント実行
npm run lint

# 単体テスト
npm test

# E2Eテスト（必要に応じて）
npm run test:e2e
```

### ステップ5: コミットとプッシュ

```bash
# 変更をステージング
git add .

# コミット（Conventional Commits形式）
git commit -m "refactor: implement constants centralization (REFACTOR-001)"

# プッシュ
git push origin refactor/issue-522-constants
```

### ステップ6: プルリクエスト作成

1. GitHubでPRを作成
2. テンプレートに従って説明を記入
3. 関連Issueをリンク（`Closes #522`）
4. レビュアーを指定

---

## 📝 Phase別実装ガイド

### Phase 1: 基盤構築

**目標**: 型安全で堅牢な基盤を構築

**実装順序**:
1. **REFACTOR-001** (定数・設定の一元管理) - 4-6h
   - 定数ファイル作成
   - ハードコードされた値の移行
   
2. **REFACTOR-002** (型安全性の向上) - 8-10h
   - any型の検出と置換
   - 型ガード関数の作成
   
3. **REFACTOR-007** (エラーハンドリングの統一) - 3-4h
   - 統一エラークラス作成
   - エラーハンドリングパターン適用

**Phase 1完了の確認**:
- [ ] 主要な定数が一元管理されている
- [ ] Critical箇所のany型使用が0件
- [ ] 統一エラーハンドリングが適用されている

### Phase 2: アーキテクチャ改善

**目標**: 疎結合でテスト容易な構造に

**実装順序**:
1. **REFACTOR-004** (サービス層の責務分離) - 10-12h
2. **REFACTOR-005** (データパイプラインの整理) - 6-8h
3. **REFACTOR-003** (計算ロジックの重複排除) - 5-6h

### Phase 3: 品質向上

**目標**: 持続可能な開発体制を構築

**実装順序**:
1. **REFACTOR-006** (テスト容易性の向上) - 6-8h
2. **REFACTOR-008** (ファイル構造の再編成) - 4-5h
3. **REFACTOR-010** (設定の型安全性) - 3-4h

### Phase 4: 監視・最適化

**目標**: 継続的なパフォーマンス監視

**実装順序**:
1. **REFACTOR-009** (パフォーマンス計測の標準化) - 3-4h

---

## 🛠️ 便利なコマンド集

### コード分析

```bash
# any型の使用箇所を検索
grep -r "\bany\b" app/lib/**/*.ts app/components/**/*.tsx | grep -v "// @ts-"

# 大きなファイルを検索（500行以上）
find app -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 500 {print $0}' | sort -rn

# ハードコードされた数値を検索
grep -r "= [0-9]\+" app --include="*.ts" --include="*.tsx"
```

### テスト実行

```bash
# 特定のファイルのテストのみ実行
npm test -- path/to/test/file.test.ts

# カバレッジ付きテスト
npm run test:coverage

# ウォッチモード
npm run test:watch
```

### ビルドとリント

```bash
# 高速ビルド（型チェックのみ）
npx tsc --noEmit

# リント（自動修正）
npm run lint:fix

# フルビルド
npm run build
```

---

## ⚠️ 注意事項

### やるべきこと

✅ 変更前に必ずテストを書く  
✅ 小さな単位でコミット  
✅ ドキュメントを更新  
✅ レビューを依頼  
✅ 既存機能を壊さない

### やってはいけないこと

❌ 複数のIssueを同時に実装  
❌ テストなしでコミット  
❌ 大規模な一括変更  
❌ 既存の動作を変更  
❌ ドキュメントの更新漏れ

---

## 📊 進捗管理

### 毎日の作業フロー

1. **朝**: `REFACTORING_ROADMAP_TRACKING.md` で今日のタスク確認
2. **作業中**: タスクリストにチェック
3. **夕方**: 進捗を記録、翌日の計画

### 週次レビュー

- 完了したタスクの確認
- KPIの測定と記録
- 次週の計画調整

---

## 🔗 関連ドキュメント

- [REFACTORING_ROADMAP_TRACKING.md](../../REFACTORING_ROADMAP_TRACKING.md) - 詳細な進捗管理
- [docs/refactoring-issues/](../refactoring-issues/) - 個別Issueテンプレート
- [REMAINING_TECH_DEBT_ROADMAP.md](../../REMAINING_TECH_DEBT_ROADMAP.md) - 技術的負債全体像

---

## 💡 Tips

### 効率化のコツ

1. **自動化の活用**: ESLintルールでany型を警告
2. **段階的改善**: ファイルを開いた時に少しずつ
3. **実用主義**: 完璧より動作するものを優先

### 困ったときは

- 既存の実装パターンを参考にする
- `docs/` ディレクトリのガイドを確認
- 小さく試して動作確認

---

**最終更新**: 2026-02-02
