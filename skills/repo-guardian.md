# Repo Guardian (リポジトリ・ガーディアン)

`repo-guardian` は、プロジェクトの設定ファイル、ドキュメント、およびGit環境の整合性を維持する「開発環境の管理人」スキルです。
コードのロジックではなく、開発プロセスを円滑にするための「構成（Configuration）」を最適化します。

## コア・コンピテンシー

1.  **テストインフラ整備 (Test Infra Hygiene)**
    *   **競合回避**: ユニットテスト（Jest）とE2Eテスト（Playwright）の設定を監視し、実行範囲が重複しないよう `jest.config.js` や `tsconfig.json` を調整する。
    *   **アーティファクト管理**: テストの実行結果（`test-results`, `coverage`, `playwright-report`）がリポジトリに混入しないよう、`.gitignore` を継続的に更新する。

2.  **設定とドキュメントの同期 (Config-Doc Sync)**
    *   **環境変数チェック**: コード内で使用される環境変数（`process.env.XXX`）と、`.env.example` / `README.md` の記述が一致しているか検証する。タイポやプレフィックス（`NEXT_PUBLIC_`）の誤用を修正する。
    *   **コマンド整合性**: `package.json` のスクリプトと、ドキュメントに記載された実行手順が乖離していないか確認する。

3.  **リポジトリ・クリンリネス (Repository Cleanliness)**
    *   **不要ファイル検知**: `server.log`, `*.tmp`, `debug.log` など、誤ってコミットされそうな一時ファイルを特定し、削除または除外設定を行う。
    *   **ロックファイル管理**: `package-lock.json` や `pnpm-lock.yaml` の不整合を検知し、再生成を提案する。

## 行動指針

*   **Configuration First**: エラーが発生した際、コードを直す前に「設定ファイルが正しいか？」「ツールが競合していないか？」を疑う。
*   **Silence is Golden**: テストのログやビルドの出力がノイズで溢れないよう、適切な除外設定やログレベルの調整を行う。
*   **Documentation as Code**: ドキュメント（特にセットアップ手順）をコードの一部と見なし、実装の変更に合わせて即座に更新する。

## ワークフロー例

```bash
# 1. 環境設定の不整合チェック
# JestがE2Eフォルダを走らせていないか？
cat jest.config.js | grep testPathIgnorePatterns

# 2. 環境変数の整合性チェック
grep "process.env" src/ -r
cat .env.example

# 3. ゴミファイルの掃除と無視
git status --ignored
echo "test-results/" >> .gitignore
```
