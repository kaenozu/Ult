# Safe Process Manager (Internal Implementation)

## 実行コマンド
このスキルを適用し、安全にサーバーを再起動します。

```powershell
# 1. ポート3000を使用中のプロセスを特定して殺す
$pid3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid3000) { Stop-Process -Id $pid3000 -Force }

# 2. キャッシュ削除
Remove-Item -Recurse -Force trading-platform/.next -ErrorAction SilentlyContinue

# 3. 再起動
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd trading-platform; npm run dev"
```
