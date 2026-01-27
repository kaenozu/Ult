# Best Practices Implementer Skill

ベストプラクティスに基づくコードレビューから実装・プルリクエスト作成までを自動化するスキル。

## 概要

このスキルは以下のフローを自動化します：

1. **ベストプラクティスレビュー**: コードベース全体をスキャンし、問題を特定
2. **問題の優先度付け**: P0（緊急）〜P3（改善）に分類
3. **自動修正**: 高優先度問題を自動的に修正
4. **検証**: テスト、型チェック、リントを実行
5. **PR作成**: 修正内容をコミットしてプルリクエストを作成

## 実行手順

### 1. ベストプラクティスレビュー

ユーザーから「ベストプラクティスでレビューして」「レビューして」といった要求があった場合、即座に包括的なレビューを実行する。

#### 1.1 コードベースの構造分析

```bash
# プロジェクト構造を把握
glob("**/*.{ts,tsx,js,jsx,py}")

# 主要な設定ファイルを確認
read("package.json", "tsconfig.json", ".eslintrc.json", "pyproject.toml")

# 既存のレビューレポートがあれば確認
glob("**/REVIEW_REPORT.md")
glob("**/PROJECT_REVIEW_REPORT.md")
```

#### 1.2 主要なコードファイルを分析

主要なファイルを優先的に読み込む：

**TypeScript/Next.js プロジェクト:**
- APIクライアント: `app/lib/api/*.ts`
- Hooks: `app/hooks/*.ts`
- Store: `app/store/*.ts`
- Components: `app/components/*.tsx`
- Error Handling: `app/lib/error-handler.ts`

**Python プロジェクト:**
- 主要モジュール: `src/**/analyzer.py`, `src/**/models.py`
- テスト: `tests/**/*.py`

#### 1.3 問題の検出と分類

以下のカテゴリで問題を検出：

**P0: 重大な問題（緊急対応）**
- セキュリティ脆弱性（APIキー露出、認証なし）
- タイムアウト未実装による無限リクエスト
- メモリリーク（AbortController未使用）
- SQLインジェクション、XSS脆弱性

**P1: 高優先度**
- 型定義の不備（Unknown型の多用）
- エラーハンドリングの不統一
- 重複コード（APIクライアント、データ処理）
- パフォーマンス問題（useCallback未使用）

**P2: 中優先度**
- テストカバレッジ不足
- 命名規則の不統一
- マジックナンバーの使用
- 未使用のimport

**P3: 低優先度**
- コメントの不足
- フォーマットの一貫性
- ドキュメントの更新

### 2. レポート作成

検出した問題を構造化されたレポートとして出力する：

```markdown
# 📋 ベストプラクティスレビューレポート

## サマリー
- 全ファイル数: [数]
- 検出された問題: [数]
- 重要度別内訳: 🔴 P0/[数] 🟡 P1/[数] 🟢 P2/[数] 🔵 P3/[数]

## 問題一覧

### 🔴 P0: 重大な問題（緊急対応）

#### 1. [カテゴリ] - [ファイル名]:[行番号]
**問題:** [詳細な説明]

**影響:** [何が起きるか]

**修正案:** ```typescript [修正コード] ```

---

### 🟡 P1: 高優先度

[同様の形式で...]

---

### 🟢 P2: 中優先度

[同様の形式で...]

---

### 🔵 P3: 低優先度

[同様の形式で...]

## 推奨アクション

1. **即時対応**: [P0問題のリスト]
2. **優先対応**: [P1問題のリスト]
3. **計画対応**: [P2問題のリスト]
4. **改善対応**: [P3問題のリスト]
```

### 3. 自動修正の実装

ユーザーから「修正して」「Fixして」といった要求があった場合、P0〜P1問題を自動的に修正する。

#### 3.1 修正前の確認

```bash
# 変更前の状態を確認
git status

# 差分を確認
git diff [対象ファイル]
```

#### 3.2 修正の実装

**例: AbortController追加**

```typescript
// 修正前
async fetchData() {
  const response = await fetch(url);
  // ...処理
}

// 修正後
async fetchData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    // ...処理
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
```

**例: 型安全性の改善**

```typescript
// 修正前
const data = await response.json() as Record<string, unknown>;

// 修正後
const data = await response.json() as AlphaVantageTimeSeriesDaily | AlphaVantageError;
```

#### 3.3 修正後の検証

**TypeScript 型チェック:**

```bash
cd [プロジェクトディレクトリ]
npx tsc --noEmit
```

**ESLint:**

```bash
npm run lint
```

**テスト実行:**

```bash
npm test
```

### 4. プルリクエストの作成

ユーザーから「プルリク出して」「PR出して」といった要求があった場合、修正内容をコミットしてプルリクエストを作成する。

#### 4.1 コミット

```bash
git add [修正ファイル]
git commit -m "[type]: [簡潔な説明]

- [詳細な変更点1]
- [詳細な変更点2]"
```

**コミットメッセージの規約:**
- `fix`: バグ修正
- `feat`: 新機能
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `sec`: セキュリティ修正

#### 4.2 プッシュ

```bash
git push origin [ブランチ名]
```

#### 4.3 プルリクエスト作成

```bash
gh pr create \
  --title "[type]: [簡潔なタイトル]" \
  --body "$(cat <<'EOF'
## Summary
- [変更内容の要約]

## Changes
- [詳細な変更内容]

## Impact
- **Before**: [変更前の状態]
- **After**: [変更後の状態]
- [影響の説明]

## Testing
- [テストの説明]
- [検証結果]
EOF
)"
```

## パターン別修正テンプレート

### 1. AbortController追加パターン

**検出:**
- `fetch()` が AbortControllerなしで使用されている
- タイムアウト設定がない

**修正:**

```typescript
async [methodName](...args): Promise<[ReturnType]> {
  const params = new URLSearchParams({...});

  const url = `${this.baseUrl}?${params}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new NetworkError(
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as [Type];
    
    // ...処理
    
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
```

### 2. メモリリーク防止パターン

**検出:**
- `useEffect` にクリーンアップがない
- 非同期リクエストがアンマウント後も実行される可能性

**修正:**

```typescript
useEffect(() => {
  const isMountedRef = { current: true };

  const fetchData = async () => {
    try {
      const data = await fetch(...);
      if (isMountedRef.current) {
        setState(data);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setError(error);
      }
    }
  };

  fetchData();

  return () => {
    isMountedRef.current = false;
  };
}, []);
```

### 3. 型安全性改善パターン

**検出:**
- `any` 型の使用
- `unknown` 型の過度な使用
- 型アサーションの乱用

**修正:**

```typescript
// 悪い例
const data = await response.json() as any;
const result = data.someProperty;

// 良い例
const data = await response.json() as SpecificType | ErrorType;

if (isErrorType(data)) {
  throw new APIError(data.message, 'API_ERROR');
}

const result = data.specificProperty;
```

### 4. エラーハンドリング統一パターン

**検出:**
- エラーハンドリングが各ファイルで異なる
- エラーメッセージが標準化されていない

**修正:**

```typescript
// 統一されたエラーハンドラーを使用
import { handleApiError } from '@/app/lib/error-handler';

try {
  const data = await fetchData();
} catch (error) {
  return handleApiError(error, 'context');
}
```

## 自動化スクリプト

以下のコマンドを順次実行して、レビューからPR作成まで自動化する：

```bash
# 1. レビュー実行
echo "📊 ベストプラクティスレビューを開始..."

# 2. 問題検出
echo "🔍 問題を検出中..."

# 3. 修正実装
echo "🔧 修正を実装中..."

# 4. 検証
echo "✅ 検証を実行中..."
npx tsc --noEmit
npm run lint
npm test

# 5. コミット
echo "💾 コミット中..."
git add .
git commit -m "fix: [変更内容]"

# 6. プッシュ & PR作成
echo "🚀 プッシュ & PR作成中..."
git push origin $(git branch --show-current)
gh pr create --title "[タイトル]" --body "[説明]"
```

## 継続的改善

- **過去の修正の追跡**: 修正した問題が再発していないか定期的に確認
- **ベストプラクティスの更新**: 新しいベストプラクティスを学習して検出ルールを更新
- **自動化の拡張**: 修正可能なパターンを拡張して自動修正の範囲を広げる

## 注意事項

1. **セキュリティ上の重要な変更**:
   - APIキー管理の修正は慎重に実施
   - .env.local がGitに含まれていないことを確認

2. **破壊的変更**:
   - 型定義の変更は影響範囲を確認
   - 関数シグネチャの変更は利用箇所すべてを更新

3. **テストの重要性**:
   - 修正前後にテストを実行
   - 回帰テストを忘れずに実行
