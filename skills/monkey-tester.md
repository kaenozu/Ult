# Monkey Tester Skill

## 概要
ランダムなユーザーアクションを自動実行してアプリケーションの挙動をテストし、バグやUI問題を検出するスキル。

## 前提条件
- Chrome DevTools MCP サーバーがインストールされていること
- 開発サーバーが起動していること（通常 http://localhost:3000）

## 1. ランダムクリックテスト (Random Click Test)
画面上の要素をランダムにクリックして、異常動作を検出する。

### 実行手順
1. `take_snapshot()` で現在のページ構造を取得
2. クリック可能な要素（button, link, input等）を抽出
3. ランダムに要素を選択して `click(uid)` を実行
4. `list_console_messages()` でエラー/警告を確認
5. `take_screenshot()` で画面状態をキャプチャ
6. 3-5を繰り返す（推奨: 10-20回）

### 検出対象
- クリック時のクラッシュ
- 意図しないページ遷移
- コンソールエラー
- UIの表示崩れ

### MCPツール使用例
```javascript
// ページ構造取得
const snapshot = take_snapshot()

// ランダムクリック
const clickableElements = snapshot.filter(el =>
  el.role === 'button' || el.role === 'link'
)
const randomElement = clickableElements[Math.floor(Math.random() * clickableElements.length)]
click(randomElement.uid)

// エラー確認
list_console_messages()
```

## 2. ナビゲーションストレス試験 (Navigation Stress Test)
ページ間遷移を繰り返して、ルーティングと状態管理の問題を検出する。

### 実行手順
1. 全ページのURLを取得
2. ランダムにページを選択して遷移
3. ページ読み込み待機
4. コンソールとネットワークを確認
5. 2-4を繰り返す（推奨: 20-30回）

### 検出対象
- ページ遷移時のエラー
- 状態の不整合
- メモリリーク
- ルーティングの問題

### 実装例
```javascript
const pages = ['/', '/heatmap', '/journal', '/screener']
for (let i = 0; i < 20; i++) {
  const randomPage = pages[Math.floor(Math.random() * pages.length)]
  navigate_page({ type: 'url', url: `http://localhost:3000${randomPage}` })
  wait_for('text', someExpectedText)
  list_console_messages()
  list_network_requests()
}
```

## 3. フォームカオステスト (Form Chaos Test)
フォームに無効なデータや境界値を入力して、バリデーションをテストする。

### 実行手順
1. `take_snapshot()` でフォーム要素を特定
2. 各フィールドに以下のパターンで入力：
   - 空文字列
   - 最大長の文字列
   - 特殊文字
   - SQLインジェクションパターン
   - XSSパターン
3. フォーム送信
4. エラーメッセージの確認
5. バリデーションが正しく動作しているか検証

### 検出対象
- バリデーションの不備
- エラーハンドリングの欠如
- セキュリティ脆弱性
- データ破損

### テストパターン例
```javascript
const testPatterns = [
  '',                    // 空文字
  'a'.repeat(1000),      // 超長文字列
  '<script>alert(1)</script>',  // XSS
  "'; DROP TABLE users; --",    // SQLインジェクション
  '日本語テスト🎯',       // マルチバイト
  'null', 'undefined', '[object Object]'
]

for (const pattern of testPatterns) {
  fill(inputUid, pattern)
  click(submitButtonUid)
  list_console_messages()
}
```

## 4. UI問題検出 (UI Issue Detection)
スクリーンショットを分析してUIの問題を自動検出する。

### 分析項目
- **レイアウト問題**: 列幅不均衡、要素の重なり
- **フォーム問題**: id/name属性の欠如、ラベルなし
- **配色問題**: コントラスト不足、色の誤用
- **レスポンシブ**: モバイル表示の問題
- **アクセシビリティ**: ARIA属性の欠如

### 実行手順
1. `take_screenshot()` でスクリーンショット取得
2. `mcp__4_5v_mcp__analyze_image` で画像分析
3. UI問題を抽出してレポート作成
4. 該当するソースコードを特定
5. 修正案を提案または実行

### 分析プロンプト例
```
この[ページ名]画面のUI問題を分析してください。特に:
1. レイアウトの問題（列幅、余白、配置）
2. フォーム要素のエラー（id/name、ラベル）
3. 配色や可読性の問題
4. レスポンシブ対応の問題
```

## 5. テスト結果のレポート作成

### レポートテンプレート
```markdown
# 🐵 モンキーテスト レポート

## 実行概要
- テスト日時: [日時]
- 対象URL: [URL]
- 実行回数: [回数]

## 検出された問題

### 🔴 重大な問題
| 問題 | 場所 | 説明 |
|------|------|------|
| [問題1] | [ファイル:行] | [説明] |

### ⚠️ 警告
| 問題 | 場所 | 説明 |
|------|------|------|
| [問題1] | [ファイル:行] | [説明] |

### ℹ️ 情報
- [UI問題など]

## 実施した修正
1. [修正内容] - [ファイル:行]

## 検証結果
- ✅ 問題解決済み: [件数]
- ⚠️ 部分解決: [件数]
- ❌ 未解決: [件数]
```

## 6. 自動修正フロー

### 検出→修正→検証サイクル
1. モンキーテスト実行
2. 問題を検出
3. ソースコードを特定
4. `Edit` または `Write` で修正
5. ブラウザをリロード
6. 再テストで問題解消を確認

### よくある問題と修正例

#### フォームフィールドに id/name がない
```typescript
// 修正前
<input type="range" value={value} onChange={onChange} />

// 修正後
<input id="minConfidence" name="minConfidence" type="range" value={value} onChange={onChange} />
```

#### ボタンのクリックハンドラがない
```typescript
// 修正前
<button onClick={undefined}>クリック</button>

// 修正後
<button onClick={() => handleClick()}>クリック</button>
```

#### ページ遷移で状態がリセットされる
```typescript
// 修正: 状態を永続化
useEffect(() => {
  localStorage.setItem('filters', JSON.stringify(filters))
}, [filters])
```

## 7. 継続的実行

### 定期テスト
開発中に定期的（例: 1時間ごと）にモンキーテストを実行して、回帰バグを早期発見する。

### CI/CD統合
- プルリクエスト作成時に自動実行
- テスト失敗時に通知
- レポートをPRコメントに投稿

### 実装例
```javascript
async function runMonkeyTest(baseUrl) {
  const results = []
  for (let i = 0; i < 20; i++) {
    const result = await randomAction(baseUrl)
    results.push(result)
    if (result.error) {
      console.error(`Error at iteration ${i}:`, result.error)
    }
  }
  return generateReport(results)
}
```

## 8. トラブルシューティング

### よくある問題と対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| クリックがタイムアウト | 要素が存在しない/隠れている | 別の要素を選択 |
| ページ遷移が失敗 | サーバーが停止 | サーバーを再起動 |
| コンソールエラー | コードのバグ | ソースコードを修正 |
| スクリーンショット取得失敗 | ページが読み込み中 | 待機時間を増やす |
