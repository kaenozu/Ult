# Safe Agent Protector Skill

## 1. 絶対禁止事項 (Hard Constraints)
- **広域キルの禁止**: `taskkill /f /im node.exe` や `Stop-Process -Name node` を実行してはならない。Gemini CLI自体がNode.jsで動作しているため、これらはエージェント自身の「自殺」を招く。
- **無差別キルの禁止**: プロセス名のみに基づいた終了を行わない。

## 2. 安全なプロセス特定手順 (Safe Identification)
開発サーバー等のプロセスを終了させる際は、必ず以下のいずれかの方法を用いる。

### A. ポート番号による特定（推奨）
特定のポート（例: 3000）を使用しているプロセスID(PID)のみを取得し、狙い撃ちで終了させる。
```powershell
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
```

### B. カレントディレクトリによるフィルタリング
`node.exe` のうち、現在のプロジェクトディレクトリを含んで実行されているものだけを終了させる。
```powershell
Get-WmiObject Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*trading-platform*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## 3. エージェントの自己防衛
- プロセス操作を行う前に、自身のPIDを取得してリストから除外するロジックを常に含める。
- 破壊的な操作の前に `Get-Process -Id $PID` で自身の安全を確認する。
