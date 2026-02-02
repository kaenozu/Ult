# [DX-001] ローカル開発環境コンテナ化

## 概要

クロスプラットフォーム互換性問題が発覚（Windows/Mac/Linux）しました。Docker ComposeとDev Containerを活用し、一貫性のある開発環境を構築します。

## 対応内容

1. **Docker Compose設定作成**
   - アプリケーションコンテナ設定
   - データベースコンテナ設定
   - ボリュームとネットワーク設定

2. **Dev Container設定**
   - `.devcontainer/devcontainer.json`作成
   - 拡張機能のプリインストール設定
   - ポート転送設定

3. **ワンコマンド起動スクリプト**
   - `docker-compose up`ラッパースクリプト
   - 初期セットアップ自動化
   - 環境変数自動設定

## 受け入れ条件（Acceptance Criteria）

- [ ] `docker-compose.yml`が作成され、全サービスが起動する
- [ ] `.devcontainer/devcontainer.json`が作成され、VS Codeで開ける
- [ ] ワンコマンド（`./start-dev.sh`等）で開発環境が起動する
- [ ] Windows/Mac/Linuxで同じ動作をする
- [ ] 環境構築時間が30分以内に短縮されている
- [ ] 新規開発者がドキュメントだけで環境構築できる

## 関連するレビュー発見事項

- クロスプラットフォーム互換性問題が発覚
- Windows/Mac/Linuxで異なる動作が発生
- 環境構築に2-4時間かかっている

## 想定工数

32時間

## 優先度

High

## 担当ロール

DevOps Engineer

## ラベル

`dx`, `priority:high`, `docker`, `devcontainer`

---

## 補足情報

### Docker Compose構成

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: ult
      POSTGRES_PASSWORD: ult
      POSTGRES_DB: ult_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Dev Container設定

```json
// .devcontainer/devcontainer.json
{
  "name": "ULT Trading Platform",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/app",
  "settings": {
    "terminal.integrated.defaultProfile.linux": "bash"
  },
  "extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-python.python"
  ],
  "postCreateCommand": "npm install",
  "forwardPorts": [3000, 5432, 6379]
}
```

### 起動スクリプト

```bash
#!/bin/bash
# start-dev.sh
set -e

echo "🚀 ULT Trading Platform 開発環境起動"

# 環境チェック
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerがインストールされていません"
    exit 1
fi

# コンテナ起動
docker-compose up -d

# ヘルスチェック
echo "⏳ サービス起動待機..."
sleep 10

# 動作確認
curl -s http://localhost:3000/api/health || echo "⚠️ ヘルスチェック失敗"

echo "✅ 開発環境起動完了！"
echo "📝 アプリケーション: http://localhost:3000"
echo "🗄️  データベース: localhost:5432"
```
