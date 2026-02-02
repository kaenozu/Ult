# [PERF-006] 負荷テスト自動化

## 概要

高負荷時の挙動検証が不足しています。負荷テストを自動化し、システムの安定性を確保します。

## 対応内容

1. **k6またはArtillery導入**
   - 負荷テストツールの選定
   - インストールと設定
   - チームトレーニング

2. **負荷テストシナリオ作成**
   - 典型的なユーザーフローの特定
   - シナリオスクリプトの作成
   - スモークテスト、負荷テスト、ストレステスト

3. **CI統合**
   - 定期実行の設定
   - パフォーマンスリグレッション検出
   - レポート自動生成

## 受け入れ条件（Acceptance Criteria）

- [ ] k6またはArtilleryが導入され、動作している
- [ ] 主要なユーザーフローの負荷テストシナリオが作成されている
- [ ] 負荷テストがCIで自動実行される
- [ ] パフォーマンスリグレッションが自動検出される
- [ ] 負荷テストレポートが自動生成・保存される
- [ ] 目標RPS（Request Per Second）が達成されている

## 関連するレビュー発見事項

- 高負荷時の挙動検証が不足
- パフォーマンスリグレッションの検出が遅れている
- 負荷テストが手動で行われている

## 想定工数

32時間

## 優先度

Low

## 担当ロール

QA Engineer + DevOps

## ラベル

`performance`, `priority:low`, `testing`, `load-test`

---

## 補足情報

### 負荷テストツール比較

| ツール | 特徴 | 推奨ケース |
|--------|------|------------|
| k6 | モダン、JavaScript、拡張性 | 大規模、複雑なシナリオ |
| Artillery | シンプル、YAML設定 | 小〜中規模、迅速な導入 |
| JMeter | 豊富な機能、GUI | エンタープライズ |

### k6シナリオ例

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // ランプアップ
    { duration: '5m', target: 100 },  // 定常負荷
    { duration: '2m', target: 200 },  // ピーク負荷
    { duration: '2m', target: 0 },    // ランプダウン
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95%が500ms以内
    http_req_failed: ['rate<0.1'],     // エラー率0.1%以下
  },
};

export default function () {
  const res = http.get('https://api.ult-trading.com/v1/market-data');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### テストスケジュール

| テストタイプ | 頻度 | 目的 |
|--------------|------|------|
| スモークテスト | 毎回のデプロイ | 基本的な機能確認 |
| 負荷テスト | 週1回 | 定常負荷での性能確認 |
| ストレステスト | 月1回 | 限界性能の確認 |
| スパイクテスト | リリース前 | 急激な負荷変動への対応 |
