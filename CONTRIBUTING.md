# 貢献ガイド

ULT Trading Platform への貢献に興味を持っていただき、ありがとうございます！このドキュメントは、プロジェクトに貢献するためのガイドラインを提供します。

## 📋 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発ワークフロー](#開発ワークフロー)
- [コーディング規約](#コーディング規約)
- [テスト](#テスト)
- [CI/CD](#cicd)
- [プルリクエストのガイドライン](#プルリクエストのガイドライン)
- [コミットメッセージ](#コミットメッセージ)

---

## 開発環境のセットアップ

### 前提条件

- Node.js 20+
- npm 9+
- Python 3.10+ (バックエンド開発の場合)
- Git

### セットアップ手順

1. **リポジトリのフォーク**
   ```bash
   # GitHubでフォークボタンをクリック
   ```

2. **ローカルにクローン**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Ult.git
   cd Ult
   ```

3. **アップストリームの設定**
   ```bash
   git remote add upstream https://github.com/kaenozu/Ult.git
   ```

4. **フロントエンドのセットアップ**
   ```bash
   cd trading-platform
   npm install
   cp .env.example .env.local
   # .env.local を編集して API キーを設定
   ```

   > **⚠️ 重要: Lockfile ポリシー**
   > 
   > このプロジェクトでは、`trading-platform/package-lock.json` を唯一の正規lockfileとして使用します。
   > - ルートの `package-lock.json` は使用しません（削除済み）
   > - 依存関係のインストールは必ず `trading-platform` ディレクトリ内で実行してください
   > - これにより、ビルドの安定性とセキュリティが向上します

5. **バックエンドのセットアップ（オプション）**
   ```bash
   cd ../backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install pytest pytest-cov pytest-asyncio
   ```

---

## 開発ワークフロー

### 1. ブランチの作成

```bash
# 最新の develop ブランチに同期
git checkout develop
git pull upstream develop

# 機能ブランチを作成
git checkout -b feature/your-feature-name
# または
git checkout -b fix/your-bug-fix
```

### ブランチ命名規則

- `feature/` - 新機能
- `fix/` - バグ修正
- `docs/` - ドキュメント変更
- `refactor/` - リファクタリング
- `test/` - テスト追加・修正
- `chore/` - ビルド・ツール設定など

### 2. 開発

```bash
cd trading-platform
npm run dev  # 開発サーバー起動
```

### 3. コミット前のチェック

**必須チェック**:
```bash
# Lint
npm run lint

# 型チェック
npx tsc --noEmit

# テスト
npm test

# ビルド
npm run build
```

### 4. コミット

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. プッシュとプルリクエスト

```bash
git push origin feature/your-feature-name
```

GitHub でプルリクエストを作成してください。

---

## コーディング規約

### TypeScript

- **厳格モード**: `strict: true` を使用
- **any 型の禁止**: できる限り `unknown` を使用
- **null 安全性**: Optional Chaining (`?.`) を活用
- **型注釈**: 明示的な型注釈を推奨

```typescript
// Good
function fetchUser(id: string): Promise<User> {
  return api.get<User>(`/users/${id}`);
}

// Bad
function fetchUser(id: any): any {
  return api.get(`/users/${id}`);
}
```

### React コンポーネント

- **関数コンポーネント**: クラスコンポーネントではなく関数コンポーネントを使用
- **Hooks**: 適切な hooks を使用
- **Props の型定義**: 全ての props に型を定義

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### ファイル構造

```
component/
├── Component.tsx          # メインコンポーネント
├── Component.test.tsx     # テスト
├── Component.types.ts     # 型定義（必要な場合）
└── index.ts              # エクスポート
```

### 命名規則

- **コンポーネント**: PascalCase (`UserProfile.tsx`)
- **関数/変数**: camelCase (`fetchUserData`)
- **定数**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **型/インターフェース**: PascalCase (`UserProfile`, `ApiResponse`)

---

## テスト

### テスト戦略

1. **単体テスト**: 全てのビジネスロジックとユーティリティ関数
2. **コンポーネントテスト**: 重要な UI コンポーネント
3. **E2E テスト**: クリティカルなユーザーフロー

### テストの実行

```bash
# 全テスト
npm test

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage

# E2E
npm run test:e2e

# E2E (UI モード)
npm run test:e2e:ui
```

### テストの書き方

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render label correctly', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### カバレッジ目標

- **全体**: 80%以上
- **ビジネスロジック**: 90%以上
- **UI コンポーネント**: 70%以上

---

## CI/CD

このプロジェクトは包括的な CI/CD パイプラインを使用しています。

### CI ワークフロー

全てのプルリクエストで自動的に実行されます：

1. ✅ **Lint & Type Check** - コード品質チェック
2. ✅ **Unit Tests** - 単体テスト実行
3. ✅ **Build** - ビルド検証
4. ✅ **E2E Tests** - E2E テスト実行
5. ✅ **Backend Tests** - Python テスト (backend変更時のみ)
6. ✅ **Security Scan** - 脆弱性スキャン

### CI を通過するために

**プルリクエスト作成前にローカルで確認**:

```bash
# 1. Lint
npm run lint
npx tsc --noEmit

# 2. Test
npm test

# 3. Build
npm run build

# 4. E2E (オプション)
npm run test:e2e
```

### CI が失敗した場合

1. **ログを確認**: GitHub Actions の詳細ログを確認
2. **ローカルで再現**: 同じコマンドをローカルで実行
3. **修正**: エラーを修正
4. **再実行**: コミット & プッシュで CI が再実行されます

詳細は [CI/CD ガイド](../docs/CI_CD_GUIDE.md) を参照してください。

---

## プルリクエストのガイドライン

### 良いプルリクエスト

- ✅ **小さく保つ**: 1つの PR で1つの機能・修正
- ✅ **明確なタイトル**: 変更内容が一目でわかる
- ✅ **詳細な説明**: 何を、なぜ、どのように変更したか
- ✅ **テスト付き**: 新機能には必ずテストを追加
- ✅ **ドキュメント更新**: 必要に応じて README やドキュメントを更新
- ✅ **CI パス**: 全ての CI チェックが緑

### プルリクエストのテンプレート

プルリクエスト作成時に自動的にテンプレートが表示されます。必須項目を埋めてください。

### レビュープロセス

1. **セルフレビュー**: まず自分でコードをレビュー
2. **CI チェック**: 全ての CI が通ることを確認
3. **レビュー依頼**: maintainers にレビューを依頼
4. **フィードバック対応**: レビューコメントに対応
5. **マージ**: 承認後、maintainer がマージ

### レビュー待ち時間

- 通常: 1-3 営業日
- 緊急: 当日（事前に連絡してください）

---

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従ってください。

### フォーマット

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードフォーマット（機能変更なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・ツール設定など
- `perf`: パフォーマンス改善

### 例

```
feat(trading): add order cancellation feature

- Add cancel button to order panel
- Implement order cancellation API
- Add confirmation dialog

Closes #123
```

```
fix(chart): resolve chart rendering issue on mobile

The chart was not displaying correctly on mobile devices
due to incorrect viewport calculations.

Fixes #456
```

### コミットメッセージのルール

- ✅ 動詞は現在形を使用（"add" not "added"）
- ✅ 1行目は50文字以内
- ✅ 本文は72文字で折り返し
- ✅ Issue番号を含める（該当する場合）

---

## ヘルプが必要な場合

- **質問**: [GitHub Discussions](https://github.com/kaenozu/Ult/discussions) で質問
- **バグ報告**: [Issues](https://github.com/kaenozu/Ult/issues) で報告
- **機能リクエスト**: [Issues](https://github.com/kaenozu/Ult/issues) で提案

---

## ライセンス

このプロジェクトに貢献することで、あなたの貢献が MIT ライセンスの下でライセンスされることに同意するものとします。

---

**ありがとうございます！🎉**

あなたの貢献がこのプロジェクトをより良いものにします。
