# 🟠 HIGH: テストタイムアウト - RealTimeMonitor

## 問題の説明

`RealTimeMonitor.test.ts` のテストで Jest のタイムアウト（5000ms）を超過しています。

```bash
FAIL app/lib/performance/__tests__/RealTimeMonitor.test.ts (11.143 s)
● RealTimeMonitor › updatePortfolio › should emit alert on threshold violation

thrown: "Exceeded timeout of 5000 ms for a test while waiting for `done()` to be called.
```

## 影響範囲

- **ファイル**: `app/lib/performance/__tests__/RealTimeMonitor.test.ts:63`
- **テスト**: `should emit alert on threshold violation`
- **現在の挙動**: 11秒以上かかり、タイムアウト発生
- **CI影響**: CIパイプラインが不安定、フィードバックループ遅延

## 根本原因

非同期のポートフォリオ更新処理でタイミング问题。`done()` コールバックが時間内に呼び出されない。

## 推奨修正

### オプション1: タイムアウト延長

```typescript
// test の前に追加
beforeAll(() => {
  jest.setTimeout(10000); // 10秒
});
```

### オプション2: モックで非同期処理を高速化

```typescript
// RealTimeMonitorの依存をモック
jest.useFakeTimers();
// タイマーを進める
jest.advanceTimersByTime(100);
```

### オプション3: テスト構造の改善

`done()` の代わりに `await` 可能な API に変更：

```typescript
it('should emit alert on threshold violation', async () => {
  await monitor.updatePortfolio(positions);

  expect(alertSystem.emit).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'THRESHOLD_VIOLATION',
      severity: 'HIGH'
    })
  );
});
```

## 受入基準

- [ ] テスト完了時間 ≤ 3秒
- [ ] タイムアウトエラーが解消
- [ ] 他のテストに影響しない
- [ ]  CIパイプラインが安定化

## 関連ファイル

- `app/lib/performance/__tests__/RealTimeMonitor.test.ts:63`
- `app/lib/performance/RealTimeMonitor.ts` (実装)

## 優先度

**P1 - High**: CI安定性に直結するため早急に対応

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
