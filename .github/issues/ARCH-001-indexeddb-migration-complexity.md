# 🟡 MEDIUM: IndexedDBバージョン管理の複雑さ

## 問題の説明

`trading-platform/app/lib/api/idb-migrations.ts` はクライアントサイドIndexedDBのバージョン管理とマイグレーションを実装していますが、スキーマが大規模化するにつれて以下の問題が生じます：

1. **移行の複雑さ**: 各バージョン間の差分マイグレーションが必要
2. **不完全なロールバック**: 失敗時の巻き戻し機構が不完全
3. **クライアント依存**: 古いブラウザでマイグレーションが失敗するリスク
4. **テスト Ghế**: クライアントDBのテストが不安定

## 現状分析

- **現在のバージョン**: IndexedDB v2 ( `idb-migrations.ts` による管理)
- **将来計画**: PostgreSQL への移行予定 (`db/schema.prisma` 存在)
- **問題**: 二重管理（クライアントDB + サーバーDB）の複雑さ

## リスク

1. **データ不整合**: クライアントとサーバーでスキーマが乖離
2. **移行失敗**: 大規模アップデートでユーザーデータが失われる可能性
3. **メンテナンス**: スキーマ変更ごとにクライアントとサーバーの両方を更新
4. **パフォーマンス**: クライアントDBのバージョンチェックがアプリ起動を遅延

## 推奨戦略

### 短期（現状維持）

#### 1. マイグレーション戦略の文書化

`db/docs/MIGRATION_STRATEGY.md` 作成：

```markdown
## マイグレーション原則

### 前方互換性（Forward Compatibility）
- 古いバージョンのアプリは新しいスキーマを読める
- 新しいフィールドは省略可能（undefined を許容）

### 後方互換性（Backward Compatibility）
- 新しいバージョンのアプリは古いデータを読める
- 古いフィールド削除は最小限に

### 移行パターン

1. **Add-only**: 新規フィールド追加は安全
2. **Rename**: 一時的に新旧フィールド並存
3. **Delete**: バージョンN+2で古いフィールド削除
```

#### 2. マイグレーション Reliability 向上

```typescript
// idb-migrations.ts に追加

class MigrationRunner {
  async migrate(targetVersion: number): Promise<void> {
    const current = await this.getCurrentVersion();
    const steps = this.getMigrationSteps(current, targetVersion);

    for (const step of steps) {
      try {
        await step.upgrade();
        await this.setVersion(step.toVersion);
      } catch (error) {
        // 詳細エラーログ
        console.error(`Migration ${step.fromVersion}->${step.toVersion} failed:`, error);
        throw new MigrationError(`Cannot migrate to version ${targetVersion}`, error);
      }
    }
  }

  // ロールバック機構（オプション）
  async rollback(targetVersion: number): Promise<void> {
    // ... 実装
  }
}
```

#### 3. テストの網羅性向上

`__tests__/idb-migrations.test.ts` に以下を追加：

```typescript
describe('Migration Scenarios', () => {
  it('should migrate from v1 to v2 correctly', async () => {
    const db = await openTestDB(1);
    await insertSampleData(db, 'v1 format');
    await db.close();

    const dbV2 = await openTestDB(2);
    const data = await fetchAllData(dbV2);

    expect(data).toMatchSnapshot(); // スナップショットテスト
  });

  it('should handle partial migration failures', async () => {
    // マイグレーション中のエラー処理テスト
  });
});
```

### 中期（PostgreSQL 移行）

1. **フェーズ1**: サーバーDBを一次ストレージに、IndexedDBはキャッシュに限定
2. **フェーズ2**: クライアントDBを `Cache API` に移行（IndexedDBラッパー）
3. **フェーズ3**: 旧バージョンクライアントへの後方互換性レイヤー廃止

`app/lib/api/db-provider.ts` 作成：

```typescript
export type DatabaseProvider = 'indexeddb' | 'postgres' | 'cache';

export class DatabaseProviderFactory {
  static getProvider(): DatabaseProvider {
    if (process.env.NEXT_PUBLIC_USE_POSTGRES === 'true') {
      return 'postgres';
    }
    if (isOnline()) {
      return 'postgres';
    }
    return 'indexeddb'; // オフライン用キャッシュ
  }
}
```

## 受入基準

- [ ] マイグレーション戦略ドキュメント完成
- [ ] マイグレーションエラーのリカバリ機構実装
- [ ] 全移行パスのテストカバレッジ 100%
- [ ] ダウングレード（ロールバック）テスト
- [ ] パフォーマンス監視：マイグレーション時間 ≤ 5秒

## 関連ファイル

- `trading-platform/app/lib/api/idb-migrations.ts`
- `trading-platform/app/lib/api/idb.ts` (レガシー)
- `db/schema.prisma`
- `db/migrations/001_initial_schema.sql`
- `db/README.md`

## 優先度

**P2 - Medium**: PostgreSQLロードマップと並行して対応

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
