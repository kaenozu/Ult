# リファクタリング統合ロードマップ - README

**Issue**: [kaenozu/Ult#532](https://github.com/kaenozu/Ult/issues/532)  
**ステータス**: Phase 0完了 ✅  
**最終更新**: 2026-02-02

---

## 📖 このプロジェクトについて

ULT Trading Platformの長期的な保守性・拡張性を確保するための包括的リファクタリング計画です。

### 目標

- **コード品質**: TypeScript厳格モード準拠、any型0件
- **保守性**: 平均ファイル行数200行以下、明確な責務分離
- **テスト**: カバレッジ80%、テスト容易な設計
- **開発効率**: 新機能追加工数を5日→2日に短縮

---

## 🚀 クイックスタート

### 1. 全体像を把握する

```bash
# メイン進捗管理ドキュメントを読む（最重要）
cat REFACTORING_ROADMAP_TRACKING.md

# または、実装サマリーから始める
cat REFACTORING_IMPLEMENTATION_SUMMARY.md
```

### 2. 実装を始める

```bash
# クイックスタートガイドを読む
cat REFACTORING_QUICKSTART.md

# Phase 1の最初のIssueを確認
cat docs/refactoring-issues/REFACTOR-001-constants.md
```

### 3. ブランチ作成と実装

```bash
# 作業ブランチ作成
git checkout -b refactor/issue-522-constants

# 実装
# ... (タスクリストに従って実装)

# テスト
npm test
npx tsc --noEmit
npm run lint

# コミット
git commit -m "refactor: implement constants centralization (REFACTOR-001)"
```

---

## 📚 ドキュメント一覧

### 主要ドキュメント

| ファイル | 説明 | 行数 | 優先度 |
|---------|------|------|--------|
| [REFACTORING_ROADMAP_TRACKING.md](./REFACTORING_ROADMAP_TRACKING.md) | 詳細な進捗管理、Phase別タスクリスト、KPI追跡 | 437 | ⭐⭐⭐ |
| [REFACTORING_QUICKSTART.md](./REFACTORING_QUICKSTART.md) | 実装手順、Phase別ガイド、コマンド集 | 243 | ⭐⭐⭐ |
| [REFACTORING_IMPLEMENTATION_SUMMARY.md](./REFACTORING_IMPLEMENTATION_SUMMARY.md) | 現状メトリクス、完了作業、次のステップ | 298 | ⭐⭐ |

### Issue詳細テンプレート

| ファイル | Issue | 説明 |
|---------|-------|------|
| [docs/refactoring-issues/README.md](./docs/refactoring-issues/README.md) | - | Issue一覧と実装順序 |
| [docs/refactoring-issues/REFACTOR-001-constants.md](./docs/refactoring-issues/REFACTOR-001-constants.md) | #522 | 定数・設定の一元管理 |

---

## 🎯 10個のリファクタリングIssue

### Phase 1: 基盤構築（High Priority）🔥

| Issue | タイトル | 工数 | 状態 | ドキュメント |
|-------|---------|------|------|-------------|
| #522 | 定数・設定の一元管理 | 4-6h | ⚪ 準備完了 | [詳細](./docs/refactoring-issues/REFACTOR-001-constants.md) |
| #523 | 型安全性の向上 | 8-10h | ⚪ 準備完了 | [TRACKING.md](./REFACTORING_ROADMAP_TRACKING.md#refactor-002-型安全性の向上) |
| #528 | エラーハンドリングの統一 | 3-4h | ⚪ 準備完了 | [TRACKING.md](./REFACTORING_ROADMAP_TRACKING.md#refactor-008-エラーハンドリングの統一) |

### Phase 2: アーキテクチャ改善

| Issue | タイトル | 工数 | 状態 |
|-------|---------|------|------|
| #525 | サービス層の責務分離 | 10-12h | ⚪ 計画済み |
| #526 | データパイプラインの整理 | 6-8h | ⚪ 計画済み |
| #524 | 計算ロジックの重複排除 | 5-6h | ⚪ 計画済み |

### Phase 3: 品質向上

| Issue | タイトル | 工数 | 状態 |
|-------|---------|------|------|
| #527 | テスト容易性の向上 | 6-8h | ⚪ 計画済み |
| #529 | ファイル構造の再編成 | 4-5h | ⚪ 計画済み |
| #531 | 設定の型安全性 | 3-4h | ⚪ 計画済み |

### Phase 4: 監視・最適化

| Issue | タイトル | 工数 | 状態 |
|-------|---------|------|------|
| #530 | パフォーマンス計測の標準化 | 3-4h | ⚪ 計画済み |

**合計推定工数**: 52-67時間（約2-3ヶ月）

---

## 📊 現状メトリクス（Baseline）

| メトリクス | 現在値 | 目標値 | ギャップ |
|-----------|--------|--------|----------|
| TypeScript strict mode | ✅ Enabled | ✅ Enabled | ✅ 達成 |
| any型使用箇所 | ~114件 | 0件 | -114件 |
| 平均ファイル行数 (lib) | 374行 | ≤200行 | -174行 |
| 最大コンポーネントサイズ | 853行 | ≤300行 | -553行 |
| テストカバレッジ | 推定45% | 80% | -35% |

**大型コンポーネント**:
- StrategyDashboard.tsx (853行)
- RiskDashboard.tsx (796行)
- BacktestResultsDashboard.tsx (704行)

---

## 🤖 自動化

### GitHub Actions ワークフロー

`.github/workflows/refactoring-progress.yml` により、以下が自動実行されます：

✅ **メトリクス自動収集**
- any型使用数の測定
- 平均ファイルサイズの計算
- 最大コンポーネントサイズの検出
- TypeScript型チェック
- テストカバレッジの測定

✅ **PRへの自動レポート**
- 進捗メトリクスをPRにコメント
- 推奨事項の表示
- トレンドの追跡

✅ **継続的監視**
- mainブランチへのpush時
- refactor/**ブランチへのpush時
- プルリクエスト作成時

---

## 🛠️ 便利なコマンド

### コード分析

```bash
# any型の使用箇所を検索
cd trading-platform
grep -r "\bany\b" app/lib/**/*.ts app/components/**/*.tsx | wc -l

# 大きなファイルを検索（500行以上）
find app -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 500' | sort -rn

# ハードコードされた数値を検索
grep -r "= [0-9]\+" app --include="*.ts" --include="*.tsx"
```

### 開発とテスト

```bash
# 型チェック
npx tsc --noEmit

# リント（自動修正付き）
npm run lint:fix

# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

---

## 📋 実装フロー

```
1. ブランチ作成
   git checkout -b refactor/issue-XXX
   
2. タスクリスト確認
   cat docs/refactoring-issues/REFACTOR-XXX.md
   
3. 実装
   # タスクリストに従って実装
   
4. テスト
   npm test && npx tsc --noEmit && npm run lint
   
5. コミット
   git commit -m "refactor: <description> (REFACTOR-XXX)"
   
6. プッシュとPR作成
   git push origin refactor/issue-XXX
   # GitHubでPR作成
   
7. 自動メトリクス確認
   # PRに自動的にメトリクスがコメントされる
   
8. レビュー・マージ
   
9. 次のIssueへ
```

---

## ⚠️ 重要な注意事項

### やるべきこと ✅

- 変更前に必ずテストを書く
- 小さな単位でコミット
- ドキュメントを更新
- レビューを依頼
- 既存機能を壊さない

### やってはいけないこと ❌

- 複数のIssueを同時に実装
- テストなしでコミット
- 大規模な一括変更
- 既存の動作を変更
- ドキュメントの更新漏れ

---

## 🎓 リソース

### プロジェクト内

- [REMAINING_TECH_DEBT_ROADMAP.md](./REMAINING_TECH_DEBT_ROADMAP.md) - 技術的負債全体像
- [REFACTORING_REPORT.md](./REFACTORING_REPORT.md) - 過去のリファクタリング履歴
- [trading-platform/README.md](./trading-platform/README.md) - プロジェクト概要

### 外部リソース

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Best Practices](https://react.dev/learn)
- [Next.js Documentation](https://nextjs.org/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📞 サポート

質問やフィードバックは以下まで：

- **Issue**: [kaenozu/Ult#532](https://github.com/kaenozu/Ult/issues/532)
- **ディスカッション**: GitHub Discussions
- **ドキュメント**: このREADMEと関連ドキュメント

---

## 📅 タイムライン

| Phase | 期間 | 工数 | 状態 |
|-------|------|------|------|
| Phase 0 (準備) | 1日 | - | ✅ 完了 |
| Phase 1 (基盤) | 2-3週間 | 15-20h | ⚪ 準備完了 |
| Phase 2 (アーキテクチャ) | 3-4週間 | 21-26h | ⚪ 計画済み |
| Phase 3 (品質) | 2-3週間 | 13-17h | ⚪ 計画済み |
| Phase 4 (監視) | 1-2週間 | 3-4h | ⚪ 計画済み |
| **合計** | **8-12週間** | **52-67h** | **4%完了** |

---

## 🎯 成功の定義

### Phase 1完了条件

- [ ] 主要な定数が `constants/` に集約
- [ ] Critical箇所の`any`型使用が0件
- [ ] 統一エラーハンドリングが全API呼び出しに適用
- [ ] TypeScript --strict モードでエラーなし
- [ ] 既存機能が全て正常動作

### 全体完了条件

- [ ] any型使用率: 15% → 0%
- [ ] テストカバレッジ: 45% → 80%
- [ ] 平均ファイル行数: 374行 → 200行以下
- [ ] 最大コンポーネント: 853行 → 300行以下
- [ ] 新機能追加工数: 5日 → 2日
- [ ] バグ修正工数: 3時間 → 1時間

---

**Ready to start Phase 1? 👉 See [REFACTORING_QUICKSTART.md](./REFACTORING_QUICKSTART.md)**

---

*このドキュメントは自動的に更新されます。最終更新: 2026-02-02*
