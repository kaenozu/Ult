# 🟡 MEDIUM: Python依存関係セキュリティスキャン未実装

## 問題の説明

`SECURITY.md:91` には `safety` ツールを使用してPython依存関係をスキャンすると記載されていますが、実際には `requirements.txt` が見つからず、セキュリティスキャンが実行されていません。

```bash
$ ls backend/requirements.txt 2>/dev/null
# ファイルなし

$ ls backend/pyproject.toml 2>/dev/null
# ファイルなし

$ ls backend/poetry.lock 2>/dev/null
# ファイルなし
```

## 影響範囲

- **ディレクトリ**: `backend/`
- **現在の状態**: 依存関係が未ロック、脆弱性スキャン不能
- **リスク**: Pythonパッケージの脆弱性が検出できない
- **ファイル数**: 6モジュール（`src/market_correlation/`, `src/supply_demand/`, `src/trade_journal_analyzer/`, `src/ult_universe/`, `src/cache/`, `src/utils/`）

## リスク

1. **脆弱性**: 古いパッケージのCVEが適用される可能性
2. **再現性**: 環境間で異なるバージョンがインストールされる
3. **ライセンス**: GPL-3.0やAGPL-3.0のライセンス問題が検出できない
4. **CI統合**: セキュリティスキャンがCIに含まれない

## 推奨修正

### オプション1: Poetry使用（推奨）

```bash
cd backend
poetry init  # pyproject.toml生成
poetry add numpy pandas scikit-learn tensorflow
poetry lock  # poetry.lock生成
```

`pyproject.toml`:

```toml
[tool.poetry]
name = "ult-backend"
version = "0.1.0"
description = "ULT Trading Platform Backend"

[tool.poetry.dependencies]
python = "^3.10"
numpy = "^1.24.0"
pandas = "^2.0.0"
scikit-learn = "^1.3.0"
tensorflow = "^2.13.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
safety = "^3.0.0"

[tool.poetry.scripts]
ult-backend = "backend.main:main"
```

### オプション2: requirements.txt使用

`backend/requirements.txt` 作成：

```txt
# Core dependencies
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
tensorflow>=2.13.0

# Dev dependencies (requirements-dev.txt)
pytest>=7.4.0
safety>=3.0.0
```

完全固定バージョン：

```txt
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
tensorflow==2.13.0
```

### 3. CI/CD 統合

`.github/workflows/backend-security.yml` 作成：

```yaml
name: Backend Security Scan
on: [push, pull_request]

jobs:
  safety:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install safety
      - run: safety check --full-report
        env:
          SAFETY_API_KEY: ${{ secrets.SAFETY_API_KEY }}
```

### 4. pre-commit フック

`.husky/pre-commit` に追加：

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Python依存関係セキュリティチェック
if [ -f "backend/requirements.txt" ]; then
  cd backend
  pip install safety
  safety check --exit
fi
```

## 受入基準

- [ ] `backend/requirements.txt` または `pyproject.toml` 作成
- [ ] 全依存関係のバージョンを完全固定
- [ ] CIワークフローに `safety check` 追加
- [ ] pre-commit フックを設定
- [ ] `safety` を `devDependencies` に追加
- [ ] セキュリティレポートを自動生成

## 関連ファイル

- `SECURITY.md:91`
- `backend/src/` (全モジュール)
- `.github/workflows/` (既存のCIワークフロー)

## 優先度

**P2 - Medium**: セキュリティ体制の重要な一部だが即時ではない

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
