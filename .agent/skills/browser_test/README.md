# Browser Test Skill

AGStock Ult Webアプリケーションの動作確認を自動化するブラウザテストスキルです。

## 🚀 機能概要

### 自動テスト項目

- **ページ読み込み**: ホームページが正しく表示されるか
- **ナビゲーション**: メニューやページ遷移が正常に動作するか
- **コンポーネント表示**: 主要なUIコンポーネントが表示されるか
- **API連携**: バックエンドAPIとの通信が正常に行われるか
- **レスポンシブデザイン**: モバイル・デスクトップ表示の確認
- **エラーハンドリング**: 404ページなどエラー時の表示確認

### レポート機能

- JSON形式の詳細テスト結果
- HTML形式のビジュアルレポート（オプション）
- スクリーンショット自動撮影（オプション）
- パフォーマンス測定（読み込み時間など）

## 📋 使用方法

### 前提条件

1. Chrome/Chromiumブラウザがインストールされていること
2. アプリケーションが実行中であること（http://localhost:3000）

### インストール

```bash
# 必要なライブラリをインストール
pip install -r .agent/skills/browser_test/requirements.txt
```

### 基本実行

```bash
# 基本的なブラウザテスト
python .agent/skills/browser_test/scripts/test_browser.py

# 可視化ブラウザでテスト
python .agent/skills/browser_test/scripts/test_browser.py --headless false

# スクリーンショット付きでテスト
python .agent/skills/browser_test/scripts/test_browser.py --screenshots

# HTMLレポートを生成
python .agent/skills/browser_test/scripts/test_browser.py --report --screenshots

# 特定URLをテスト
python .agent/skills/browser_test/scripts/test_browser.py --url http://localhost:3000/settings
```

### オプション一覧

- `--headless`: ヘッドレスモード（デフォルト: true）
- `--url`: テスト対象URL（デフォルト: http://localhost:3000）
- `--screenshots`: スクリーンショット撮影
- `--report`: HTMLレポート生成
- `--timeout`: テストタイムアウト秒数（デフォルト: 10）

## 📊 出力結果

### テスト結果（JSON）

```json
{
  "summary": {
    "total_tests": 6,
    "passed": 5,
    "failed": 1,
    "success_rate": "83.3%",
    "total_duration": 12.45,
    "url": "http://localhost:3000",
    "timestamp": "2026-01-15T10:30:00"
  },
  "results": [
    {
      "name": "ページ読み込み",
      "status": "pass",
      "duration": 2.1,
      "screenshot": "screenshots/ページ読み込み_20260115_103000.png"
    }
  ]
}
```

### HTMLレポート

- 視覚的に確認しやすいレポート
- スクリーンショット付き
- エラー詳細の表示

## 🔧 テスト詳細

### 1. ページ読み込みテスト

- 指定URLのページが正しく読み込まれるか
- ページタイトルの確認
- メインコンテンツの存在確認

### 2. ナビゲーションテスト

- 設定ページへの遷移
- ホームページへの戻る
- リンクのクリック動作

### 3. コンポーネント表示テスト

- ポートフォリオサマリー
- AIシグナルカード
- 自動売買コントロール
- 主要UI要素の存在確認

### 4. API連携テスト

- APIリクエストが正常に行われるか
- レスポンスエラーの有無
- データ取得の確認

### 5. レスポンシブデザインテスト

- モバイルサイズ（375x667）での表示
- デスクトップサイズ（1920x1080）での表示
- レイアウト崩れの確認

### 6. エラーハンドリングテスト

- 存在しないページへのアクセス
- 404エラーページの表示
- サーバーエラーの適切な処理

## 🛠️ カスタマイズ

### テスト項目の追加

`test_*.py`内に新しいテストメソッドを追加：

```python
def test_custom_functionality(self):
    """カスタム機能テスト"""
    self.driver.get(self.config.url)

    # テストロジックを記述
    element = self.driver.find_element(self.By.ID, "custom-element")
    if not element.is_displayed():
        raise Exception("カスタム要素が表示されません")
```

### 待機時間の調整

`config.timeout`値で各テストの待機時間を調整可能。

### スクリーンショットのカスタマイズ

`screenshot_dir`で保存先ディレクトリを変更可能。

## 🔍 トラブルシューティング

### WebDriverが起動しない

- Chromeブラウザがインストールされているか確認
- ChromeDriverのバージョンが合っているか確認

### APIテストが失敗する

- バックエンドサーバーが起動しているか確認
- APIエンドポイントのURLが正しいか確認

### タイムアウトが頻発する

- `--timeout`値を増やす
- ネットワーク接続を確認
- サーバーの応答性を確認

## 📝 ログとレポート

実行後、以下のファイルが生成されます：

- `browser_test_results.json`: 詳細なテスト結果
- `browser_test_report.html`: ビジュアルレポート（オプション）
- `screenshots/*.png`: スクリーンショット（オプション）

このスキルにより、Webアプリケーションの品質保証を自動化し、継続的な改善をサポートします。
