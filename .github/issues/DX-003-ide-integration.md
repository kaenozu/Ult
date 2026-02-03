# [DX-003] IDE統合設定の整備

## 概要

エディタ設定が統一されておらず、フォーマット競合が発生しています。VS Code設定を整備し、EditorConfigを見直します。

## 対応内容

1. **`.vscode/settings.json`共有設定**
   - 推奨設定の定義
   - フォーマッタ設定
   - Lint統合設定

2. **EditorConfig見直し**
   - 全ファイルタイプ対応
   - チーム合意の取れた設定
   - 既存ファイルの一括修正

3. **推奨拡張機能リスト作成**
   - `.vscode/extensions.json`作成
   - 必須/推奨の分類
   - インストール手順の文書化

## 受け入れ条件（Acceptance Criteria）

- [ ] `.vscode/settings.json`が作成され、チームで共有されている
- [ ] `.editorconfig`が見直され、全ファイルタイプをカバーしている
- [ ] `.vscode/extensions.json`が作成され、推奨拡張機能が定義されている
- [ ] フォーマット競合が解消されている
- [ ] 新規開発者が推奨設定をワンクリックで適用できる
- [ ] 異なるOS間で同じフォーマット結果が得られる

## 関連するレビュー発見事項

- エディタ設定が統一されていない
- フォーマット競合が発生している
- インデントスタイルがファイルによって異なる

## 想定工数

12時間

## 優先度

Medium

## 担当ロール

Tech Lead

## ラベル

`dx`, `priority:medium`, `ide`, `editorconfig`

---

## 補足情報

### VS Code設定例

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true
  }
}
```

### EditorConfig設定

```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.{py,java}]
indent_size = 4

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2
```

### 推奨拡張機能

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-python.python",
    "ms-python.black-formatter"
  ]
}
```
