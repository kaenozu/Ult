# [KNOW-003] コードレビュー知見の蓄積

## 概要

レビューで得られた知見が散逸しています。コードレビューの知見を蓄積し、再利用可能にします。

## 対応内容

1. **レビューコメントの分類・タグ付け**
   - レビューコメントのカテゴリ分類
   - タグ付け規則の策定
   - 検索可能な構造化

2. **よくある指摘のFAQ化**
   - 頻出指摘の抽出
   - FAQドキュメント作成
   - コード例付きの説明

3. **ベストプラクティス集作成**
   - 言語別ベストプラクティス
   - フレームワーク別ベストプラクティス
   - パターンカタログ

## 受け入れ条件（Acceptance Criteria）

- [ ] レビューコメントの分類体系が策定されている
- [ ] よくある指摘が10件以上FAQ化されている
- [ ] ベストプラクティス集が作成され、チームで共有されている
- [ ] 新規開発者がレビュー指摘を自己修正できる率が50%以上
- [ ] 同様の指摘の繰り返しが30%減少している
- [ ] レビュー時間が20%短縮されている

## 関連するレビュー発見事項

- レビューで得られた知見が散逸している
- 同様の指摘が繰り返される
- 新規開発者が同じミスを繰り返す

## 想定工数

12時間

## 優先度

Medium

## 担当ロール

Tech Lead

## ラベル

`knowledge-sharing`, `priority:medium`, `code-review`, `best-practices`

---

## 補足情報

### レビューコメント分類

| カテゴリ | タグ | 説明 |
|----------|------|------|
| セキュリティ | `security` | セキュリティ関連 |
| パフォーマンス | `performance` | パフォーマンス関連 |
| 可読性 | `readability` | コードの読みやすさ |
| 設計 | `design` | アーキテクチャ/設計 |
| テスト | `testing` | テスト関連 |
| TypeScript | `typescript` | 型関連 |

### FAQ例

```markdown
## よくあるレビュー指摘 FAQ

### Q: any型を使わないでください。どう修正すればよいですか？

A: 適切な型を定義するか、unknown型を使用してください。

```typescript
// ❌ 避ける
function process(data: any) { }

// ✅ 推奨
interface Data {
  id: string;
  value: number;
}
function process(data: Data) { }

// ✅ 型が不明な場合
function process(data: unknown) {
  if (isValidData(data)) {
    // 処理
  }
}
```
```

### ベストプラクティス集構成

```
best-practices/
├── typescript/
│   ├── type-safety.md
│   ├── error-handling.md
│   └── async-patterns.md
├── react/
│   ├── component-design.md
│   ├── state-management.md
│   └── performance.md
├── python/
│   ├── type-hints.md
│   ├── error-handling.md
│   └── testing.md
└── general/
    ├── code-review-checklist.md
    ├── git-workflow.md
    └── documentation.md
```
