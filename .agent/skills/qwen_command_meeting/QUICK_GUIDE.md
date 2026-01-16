# Qwen会議クイック起動ガイド

## 🚀 「議論して」で簡単会議スタート

### 基本的な使い方

```bash
# トピックを指定して会議開始
python quick_meeting.py "日本の首都について議論"

# 人工知能について議論
python quick_meeting.py "AIの未来について議論"

# 環境問題について議論
python quick_meeting.py "環境問題の解決策を議論"
```

### 対応モード

**1. Qwenコマンド利用可能時**

- 本物のQwen AIと対話
- 高度な会議ファシリテーション
- 自動議事録保存

**2. Qwenコマンド未インストール時**

- シミュレーションモードで対話
- 簡単な対話機能
- フォールバックとして動作

### おすすめトピック例

```bash
# ビジネス系
python quick_meeting.py "新事業のアイデア出し"

# 技術系
python quick_meeting.py "プログラミング言語の選択基準"

# 社会系
python quick_meeting.py "高齢化社会の課題と解決策"

# 教育系
python quick_meeting.py "未来の教育について議論"

# 個人開発
python quick_meeting.py "キャリアプランニング"
```

### Qwenコマンドインストール方法

```bash
# pipでインストール
pip install qwen

# 確認
qwen --version

# テスト
qwen "こんにちは"
```

### 実行例

```bash
$ python quick_meeting.py "日本の首都について議論"
🤖 Qwen会議を開始します: 日本の首都について議論
==================================================
============================================================
Qwen Command Meeting Agent - 日本の首都について議論
============================================================

Meeting: 日本の首都について議論
Duration: 30 minutes
Language: ja

Qwen AI: 皆様、こんにちは。本日は「日本の首都について」議論させていただきます...

💬 あなたの入力: 東京の特徴について教えて
🤖 Qwen AI: 東京の特徴についてですね。いくつか重要な側面があります...
```

### カスタマイズ設定

会議時間や言語を変更したい場合は、直接スクリプトを編集：

```python
# デフォルト設定
DURATION = 30  # 分
LANGUAGE = "ja"  # ja, en, zh
```

### 連携機能

議事録は自動的に`meeting_transcripts/`ディレクトリに保存されます：

- JSON形式で構造化
- タイムスタンプ付き
- AI応答の完全記録
- 後からの分析可能

### トラブルシューティング

**Qwenコマンドが見つからない場合:**

```bash
# インストール確認
which qwen

# 再インストール
pip install qwen --force-reinstall
```

**文字化けする場合:**

```bash
# エンコーディング設定
export PYTHONIOENCODING=utf-8
```

---

このクイック起動ツールを使えば、「議論して」の感覚で即座に知的な会議を始められます！
