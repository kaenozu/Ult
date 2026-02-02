# [DOC-003] APIドキュメント自動生成導入

## 概要

OpenAPI仕様がないため、API仕様の把握が困難です。APIドキュメントを自動生成し、常に最新の状態を保ちます。

## 対応内容

1. **FastAPI/OpenAPI導入検討**
   - 現状のAPI実装方式の分析
   - FastAPI移行の検討
   - 段階的導入計画の策定

2. **既存APIからの仕様書生成**
   - 既存エンドポイントの分析
   - OpenAPI仕様の作成
   - 自動生成スクリプトの実装

3. **Swagger UI展開**
   - Swagger UIのセットアップ
   - 認証連携の設定
   - GitHub Pagesまたは専用環境への展開

## 受け入れ条件（Acceptance Criteria）

- [ ] 全APIエンドポイントがOpenAPI仕様で記述されている
- [ ] Swagger UIが利用可能で、APIの対話的テストが可能である
- [ ] API仕様がコード変更時に自動更新される
- [ ] 認証付きエンドポイントのテスト方法が文書化されている
- [ ] APIバージョニング方針が定められている
- [ ] 外部開発者向けのAPIガイドが作成されている

## 関連するレビュー発見事項

- OpenAPI仕様が存在しない
- API仕様の把握が困難で、フロントエンド開発に支障が出ている
- API変更時の影響範囲が不明確

## 想定工数

16時間

## 優先度

Medium

## 担当ロール

Backend Engineer

## ラベル

`documentation`, `priority:medium`, `api`, `openapi`

---

## 補足情報

### 実装アプローチ比較

| アプローチ | 工数 | メリット | デメリット |
|------------|------|----------|------------|
| FastAPI移行 | 高 | 自動生成、型安全性 | 大幅な書き換え必要 |
| 既存コード解析 | 中 | 既存資産活用 | 完全自動化は困難 |
| 手動OpenAPI作成 | 低 | 即座に開始可能 | メンテナンス負担 |

### 推奨：段階的アプローチ

```
Phase 1: 既存APIの分析とOpenAPI仕様作成（手動）
Phase 2: Swagger UI展開と運用開始
Phase 3: コードからの自動生成スクリプト開発
Phase 4: 新規APIはFastAPIで実装（検討）
```

### OpenAPI仕様例

```yaml
openapi: 3.0.0
info:
  title: ULT Trading Platform API
  version: 1.0.0
paths:
  /api/v1/trades:
    get:
      summary: 取引一覧取得
      parameters:
        - name: symbol
          in: query
          schema:
            type: string
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Trade'
```
