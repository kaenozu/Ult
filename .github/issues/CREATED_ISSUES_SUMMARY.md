# NEXT_PHASE_ACTION_PLAN - 作成済みIssue一覧

**作成日**: 2026-02-02  
**合計Issue数**: 39件

---

## 📊 カテゴリ別サマリー

| カテゴリ | Issue数 | 優先度High | 優先度Medium | 優先度Low |
|----------|---------|------------|--------------|-----------|
| セキュリティ対策 (SEC) | 5 | 2 | 2 | 1 |
| 技術的負債 (DEBT) | 6 | 2 | 3 | 1 |
| ドキュメント (DOC) | 5 | 1 | 3 | 1 |
| CI/CD (CI) | 6 | 3 | 3 | 0 |
| DX改善 (DX) | 6 | 2 | 3 | 1 |
| パフォーマンス (PERF) | 6 | 2 | 3 | 1 |
| 知識共有 (KNOW) | 5 | 2 | 2 | 1 |
| **合計** | **39** | **14** | **19** | **6** |

---

## 🔒 セキュリティ対策 (5件)

| ID | タイトル | 優先度 | 工数 | 担当 |
|----|----------|--------|------|------|
| [SEC-001](SEC-001-sast-dast-automation.md) | SAST/DAST自動スキャンの導入 | High | 16h | DevSecOps Engineer |
| [SEC-002](SEC-002-dependency-vulnerability-monitoring.md) | 依存関係脆弱性のリアルタイム監視 | High | 8h | DevOps Engineer |
| [SEC-003](SEC-003-security-incident-response.md) | セキュリティインシデント対応手順書の作成 | Medium | 12h | Security Lead + Tech Lead |
| [SEC-004](SEC-004-secret-management-enhancement.md) | シークレット管理の強化 | Medium | 20h | DevOps Engineer + Backend Engineer |
| [SEC-005](SEC-005-security-review-regular.md) | セキュリティレビュー定期開催 | Low | 4h/月 | Tech Lead + 全開発者 |

---

## 🔧 技術的負債 (6件)

| ID | タイトル | 優先度 | 工数 | 担当 |
|----|----------|--------|------|------|
| [DEBT-001](DEBT-001-python-error-handling-unification.md) | Pythonエラーハンドリング統一 | High | 24h | Backend Engineer |
| [DEBT-002](DEBT-002-backend-test-coverage-improvement.md) | バックエンドテストカバレッジ向上 | High | 40h | Backend Engineer + QA Engineer |
| [DEBT-003](DEBT-003-magic-numbers-externalization.md) | マジックナンバー外部化 | Medium | 16h | Backend Engineer |
| [DEBT-004](DEBT-004-skill-json-schema-standardization.md) | スキルシステムJSONスキーマ標準化 | Medium | 32h | Frontend Engineer + Architect |
| [DEBT-005](DEBT-005-type-safety-improvement.md) | 型安全性向上（any撲滅） | Medium | 24h | Frontend Engineer |
| [DEBT-006](DEBT-006-skill-duplication-removal.md) | スキルシステム重複排除 | Low | 20h | Architect |

---

## 📚 ドキュメント (5件)

| ID | タイトル | 優先度 | 工数 | 担当 |
|----|----------|--------|------|------|
| [DOC-001](DOC-001-documentation-auto-generation.md) | ドキュメント自動生成パイプライン構築 | High | 24h | DevOps Engineer + Tech Writer |
| [DOC-002](DOC-002-documentation-review-regular.md) | ドキュメントレビュー定期開催 | Medium | 4h/月 | Tech Lead + 全開発者 |
| [DOC-003](DOC-003-api-documentation-auto-generation.md) | APIドキュメント自動生成導入 | Medium | 16h | Backend Engineer |
| [DOC-004](DOC-004-onboarding-documentation.md) | オンボーディングドキュメント整備 | Medium | 20h | Tech Lead |
| [DOC-005](DOC-005-adr-introduction.md) | アーキテクチャ決定記録（ADR）導入 | Low | 12h | Architect |

---

## 🚀 CI/CD (6件)

| ID | タイトル | 優先度 | 工数 | 担当 |
|----|----------|--------|------|------|
| [CI-001](CI-001-nodejs-version-unification.md) | Node.jsバージョン統一 | High | 8h | DevOps Engineer |
| [CI-002](CI-002-workflow-deduplication.md) | ワークフロー重複の解消 | High | 16h | DevOps Engineer |
| [CI-003](CI-003-npm-audit-fix.md) | npm audit失許容の解消 | High | 12h | DevOps Engineer |
| [CI-004](CI-004-build-cache-optimization.md) | ビルドキャッシュ最適化 | Medium | 12h | DevOps Engineer |
| [CI-005](CI-005-canary-release.md) | カナリアリリース導入 | Medium | 24h | DevOps Engineer + SRE |
| [CI-006](CI-006-environment-deployment-automation.md) | 環境別デプロイ自動化 | Medium | 20h | DevOps Engineer |

---

## 🛠️ DX改善 (6件)

| ID | タイトル | 優先度 | 工数 | 担当 |
|----|----------|--------|------|------|
| [DX-001](DX-001-local-dev-containerization.md) | ローカル開発環境コンテナ化 | High | 32h | DevOps Engineer |
| [DX-002](DX-002-precommit-hook-enhancement.md) | プレコミットフック強化 | High | 8h | DevOps Engineer |
| [DX-003](DX-003-ide-integration.md) | IDE統合設定の整備 | Medium | 12h | Tech Lead |
| [DX-004](DX-004-local-test-speedup.md) | ローカルテスト高速化 | Medium | 16h | Frontend Engineer |
| [DX-005](DX-005-skill-schema-validation.md) | スキルスキーマバリデーション自動化 | Medium | 12h | Frontend Engineer |
| [DX-006](DX-006-dev-dashboard.md) | 開発用ダッシュボード作成 | Low | 24h | Frontend Engineer |

---

## ⚡ パフォーマンス (6件)

| ID | タイトル | 優先度 | 工数 | 担当 |
|----|----------|--------|------|------|
| [PERF-001](PERF-001-performance-monitoring-infrastructure.md) | パフォーマンス計測基盤構築 | High | 24h | Frontend Engineer + Backend Engineer |
| [PERF-002](PERF-002-web-worker-migration.md) | Web Worker移行計画 | High | 40h | Frontend Engineer |
| [PERF-003](PERF-003-memoization-strategy.md) | メモ化戦略の徹底適用 | Medium | 20h | Frontend Engineer |
| [PERF-004](PERF-004-data-fetching-optimization.md) | データ取得最適化 | Medium | 24h | Backend Engineer |
| [PERF-005](PERF-005-bundle-size-optimization.md) | バンドルサイズ最適化 | Medium | 16h | Frontend Engineer |
| [PERF-006](PERF-006-load-test-automation.md) | 負荷テスト自動化 | Low | 32h | QA Engineer + DevOps |

---

## 📖 知識共有 (5件)

| ID | タイトル | 優先度 | 工数 | 担当 |
|----|----------|--------|------|------|
| [KNOW-001](KNOW-001-tech-study-session.md) | 技術勉強会定期開催 | High | 4h/月 | Tech Lead |
| [KNOW-002](KNOW-002-knowledge-base.md) | ナレッジベース構築 | High | 24h | Tech Writer + Tech Lead |
| [KNOW-003](KNOW-003-code-review-knowledge.md) | コードレビュー知見の蓄積 | Medium | 12h | Tech Lead |
| [KNOW-004](KNOW-004-pair-programming.md) | ペアプログラミング推奨 | Medium | 継続 | 全開発者 |
| [KNOW-005](KNOW-005-conference-support.md) | 外部カンファレンス参加支援 | Low | 予算依存 | Engineering Manager |

---

## 📅 推奨実施順序（優先度順）

### Phase 1: 基盤構築（2026年2月 - 3月）

**High優先度（14件）**

1. **SEC-001**: SAST/DAST自動スキャンの導入
2. **SEC-002**: 依存関係脆弱性のリアルタイム監視
3. **DEBT-001**: Pythonエラーハンドリング統一
4. **DEBT-002**: バックエンドテストカバレッジ向上
5. **DOC-001**: ドキュメント自動生成パイプライン構築
6. **CI-001**: Node.jsバージョン統一
7. **CI-002**: ワークフロー重複の解消
8. **CI-003**: npm audit失許容の解消
9. **DX-001**: ローカル開発環境コンテナ化
10. **DX-002**: プレコミットフック強化
11. **PERF-001**: パフォーマンス計測基盤構築
12. **PERF-002**: Web Worker移行計画
13. **KNOW-001**: 技術勉強会定期開催
14. **KNOW-002**: ナレッジベース構築

### Phase 2: 高度化（2026年4月 - 6月）

**Medium優先度（19件）**

- SEC-003, SEC-004
- DEBT-003, DEBT-004, DEBT-005
- DOC-002, DOC-003, DOC-004
- CI-004, CI-005, CI-006
- DX-003, DX-004, DX-005
- PERF-003, PERF-004, PERF-005
- KNOW-003, KNOW-004

### Phase 3: 運用・改善（2026年7月以降）

**Low優先度（6件）**

- SEC-005, DEBT-006, DOC-005
- DX-006, PERF-006, KNOW-005

---

## 📝 Issue作成コマンド（gh CLI使用時）

```bash
# セキュリティ対策
cd .github/issues && for f in SEC-*.md; do gh issue create --title "$(head -1 $f | sed 's/# //')" --body-file "$f" --label "security"; done

# 技術的負債
cd .github/issues && for f in DEBT-*.md; do gh issue create --title "$(head -1 $f | sed 's/# //')" --body-file "$f" --label "tech-debt"; done

# ドキュメント
cd .github/issues && for f in DOC-*.md; do gh issue create --title "$(head -1 $f | sed 's/# //')" --body-file "$f" --label "documentation"; done

# CI/CD
cd .github/issues && for f in CI-*.md; do gh issue create --title "$(head -1 $f | sed 's/# //')" --body-file "$f" --label "ci-cd"; done

# DX改善
cd .github/issues && for f in DX-*.md; do gh issue create --title "$(head -1 $f | sed 's/# //')" --body-file "$f" --label "dx"; done

# パフォーマンス
cd .github/issues && for f in PERF-*.md; do gh issue create --title "$(head -1 $f | sed 's/# //')" --body-file "$f" --label "performance"; done

# 知識共有
cd .github/issues && for f in KNOW-*.md; do gh issue create --title "$(head -1 $f | sed 's/# //')" --body-file "$f" --label "knowledge-sharing"; done
```

---

## 🔗 関連ドキュメント

- [NEXT_PHASE_ACTION_PLAN.md](../../plans/NEXT_PHASE_ACTION_PLAN.md) - 元のアクションプラン
- [ROADMAP.md](../../ROADMAP.md) - プロジェクトロードマップ
- [SECURITY.md](../../SECURITY.md) - セキュリティポリシー
