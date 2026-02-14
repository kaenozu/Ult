# ESLint警告一括修正スキル

## 概要

大規模なコードベースでのESLint警告を効率的に削減するための戦略と実践的なテクニック。

## 基本方針

### 1. 優先順位付け

**P0（緊急）**: ビルドを妨げるエラー
- TypeScript型エラー
- インポートエラー
- 構文エラー

**P1（重要）**: 本番コードの品質問題
- 未使用インポート/変数（lib/, components/）
- any型の使用
- React Hook依存配列

**P2（普通）**: テストコード、ドキュメント
- テストファイルの警告
- 未使用変数（一時的なもの）

### 2. 効率的な修正アプローチ

#### フェーズ1: 自動修正可能なものを処理

```bash
# 自動修正を実行
npx eslint --fix <target-files>

# 特定のルールのみ修正
npx eslint --fix --rule '@typescript-eslint/no-unused-vars: error' .
```

#### フェーズ2: ファイル別の手動修正

**未使用インポートの削除**:
```typescript
// Before
import { 
  ComplexityMetrics,  // 未使用
  OverfittingDetector 
} from './OverfittingDetector';

// After
import { 
  OverfittingDetector 
} from './OverfittingDetector';
```

**未使用変数の処理**:
```typescript
// 単純な代入のみの場合 → 削除
const result = await api.call(); // 未使用

// After
await api.call();

// 関数パラメータの場合 → _プレフィックス
const callback = (task: Task) => { }  // 未使用

// After
const callback = (_task: Task) => { }
```

#### フェーズ3: 複雑なケースの対処

**型の不一致**:
```typescript
// 問題: unknown型をErrorとして扱えない
catch (err) {
  logger.error('Error', err); // 型エラー
}

// 解決策: 型ガード
const error = err instanceof Error ? err : new Error(String(err));
logger.error('Error', error);
```

**DOMException | nullの処理**:
```typescript
// 問題: request.errorがnullの可能性
request.onerror = () => {
  logger.error('Failed', request.error); // 型エラー
};

// 解決策: Null合体演算子
request.onerror = () => {
  const error = request.error ?? new Error('Operation failed');
  logger.error('Failed', error);
  reject(error);
};
```

### 3. よくある落とし穴

#### インポート削除時の注意

**問題**: 型ガード関数を削除してしまい、実際には使用しているエラークラスが使えなくなる

```typescript
// 誤って削除してしまう
import { ApiError } from './ApiError'; // isApiErrorで使用している

// 正しくは型ガード関数は残す
import { 
  NetworkError,  // 実際にnewするため必要
  isNetworkError // 型ガード関数
} from './ApiError';
```

**確認方法**:
```bash
# 削除前に使用箇所を確認
grep -n "ApiError" app/lib/errors/handlers.ts
```

#### 未使用パラメータの扱い

**ESLintルール**: `@typescript-eslint/no-unused-vars`

```typescript
// 許可パターン（_プレフィックス）
const callback = (_unused: string) => { };

// 許可パターン（先頭に_）
map((_, index) => index);
```

### 4. 段階的改善戦略

**段階1**: 明らかに不要なもののみ削除（安全）
- 未使用インポート
- 明らかに不要な変数代入

**段階2**: テストファイル・サンプルコード
- E2Eテストの未使用変数
- Exampleファイル

**段階3**: 本番コードの慎重な修正
- 一度に1ファイルずつ
- ビルド確認を頻繁に実行
- コードレビュー必須

### 5. 自動化スクリプト

```bash
#!/bin/bash
# fix-eslint.sh

FILES=(
  "app/lib/AnalysisService.ts"
  "app/components/AlertPanel.tsx"
  "app/lib/PerformanceScreenerService.ts"
)

echo "=== ESLint自動修正開始 ==="
for file in "${FILES[@]}"; do
  echo "修正中: $file"
  npx eslint --fix "$file" 2>&1 | grep -E "fixed|✖" || echo "  - 完了"
done

echo ""
echo "=== 残りの警告数 ==="
npx eslint --format json . 2>&1 | python3 -c "
import sys, json
data = json.load(sys.stdin)
count = sum(1 for f in data for m in f.get('messages', []) if m.get('severity') == 1)
print(f'残り: {count}件')
"
```

## 実績メトリクス

| フェーズ | 修正前 | 修正後 | 削減率 |
|---------|-------|-------|-------|
| ドキュメント整理 | - | 22ファイル削除 | - |
| ESLint第1弾 | 876件 | 811件 | -7.4% |
| ESLint第2弾 | 811件 | 約750件（予定） | -7.5% |

## 推奨ツール

1. **VS Code ESLint拡張**: リアルタイム警告表示
2. **husky + lint-staged**: コミット前自動チェック
3. **GitHub Actions**: PR時にESLintチェック

## ベストプラクティス

- **大規模修正は分割**: 1PRあたり50-100ファイルを超えない
- **ビルド確認を必須**: 修正後は必ず`npm run build`
- **テスト実行**: `npm run test:ci`で品質担保
- **レビュー重要**: 機械的な修正でも人間が確認

## 関連ドキュメント

- `docs/ESLint_RULES.md` - プロジェクト固有のルール
- `.eslintrc.js` - 設定ファイル
- `package.json` - スクリプト定義
