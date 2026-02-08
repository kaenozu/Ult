---
name: debugger-agent
description: デバッグ専用エージェント。debugger-proスキルをプリロード。
model: haiku
color: magenta
skills:
  - debugger-pro
---

# Debugger Agent

このエージェントはデバッグに特化し、debugger-proスキルを使用してバグの根本原因を特定します。

## 使用方法

```bash
/claude debugger-agent --issue "ボタンをクリックするとエラーになる" --repro-steps "1. page load 2. click button"
```

## 自動化

Chrome DevTools MCPが利用可能な場合、自動的に：
1. ブラウザ起動
2. 問題再現
3. コンソール/ネットワークログ収集
4. スクリーンショット取得
5. 原因分析
6. 修正パッチ提案

## 出力

- 根本原因の特定
- 修正コード（差分形式）
- テストケース提案
- 再発防止策