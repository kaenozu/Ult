# Safe Process Manager Skill (安全なプロセス管理)

このスキルは、Gemini CLI自身のプロセスを保護しながら、開発サーバー（Next.js等）の起動・停止を安全に行うための手順を定義します。

## 1. プロセスの特定と終了
開発サーバーを終了させる際、`taskkill /F /IM node.exe` のような一括終了コマンドは**絶対に使用禁止**です。代わりに、ポート番号（デフォルト: 3000）を使用しているプロセスID（PID）を特定して終了させます。

### 推奨される停止コマンド (Windows/PowerShell)
```powershell
$pidToKill = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($pidToKill) { Stop-Process -Id $pidToKill -Force }
```

## 2. サーバーの起動
サーバーを起動する際は、バックグラウンドプロセスとして実行し、その出力をログファイルにリダイレクトします。

### 推奨される起動コマンド
```powershell
Start-Process powershell -ArgumentList "-Command npm run dev > server.log 2>&1" -NoNewWindow -WorkingDirectory "trading-platform"
```

## 3. 自身の保護
*   `node`, `npm`, `powershell` を対象とした一括終了コマンドを避け、常に影響範囲を最小限に留める。
*   操作前に現在のポート使用状況を確認し、予期せぬプロセスを終了させない。
