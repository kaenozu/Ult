#!/usr/bin/env bash

# ULT 全Issue並列実装開始スクリプト
# 全てのworktreeを別ターミナルで開くか、順に実行して

set -e

echo "=========================================="
echo "ULT 全Issue並列実装開始"
echo "=========================================="
echo ""

# 各worktreeのディレクトリとコマンド
declare -A WORKTREES=(
  ["SECURITY-001"]="cd worktrees/issues/SECURITY-001_csrf-protection/trading-platform && echo '=== CSRF保護: テスト実行・他ルート適用 ===' && npm run typecheck"
  ["SECURITY-002"]="cd worktrees/issues/SECURITY-002_websocket-auth && echo '=== WebSocket認証: 実装開始 ===' && ls scripts/websocket-server.js"
  ["SECURITY-003"]="cd worktrees/issues/SECURITY-003_python-deps-scan/backend && echo '=== Pythonセキュリティ: pyproject.toml作成 ===' && python --version"
  ["TEST-001"]="cd worktrees/issues/TEST-001_realtimemonitor-timeout/trading-platform && echo '=== テスト修正: RealTimeMonitor ===' && cat app/lib/performance/__tests__/RealTimeMonitor.test.ts | head -70"
  ["TEST-002"]="cd worktrees/issues/TEST-002_long-running-tests/trading-platform && echo '=== テスト最適化: EnhancedSentimentService ===' && ls app/lib/alternativeData/__tests__/"
  ["PERFORMANCE-001"]="cd worktrees/issues/PERFORMANCE-001_remove-debug-logs/trading-platform && echo '=== ログ削除: grep console.logを実行 ===' && grep -r \"console\.log\" app/lib/ | wc -l"
  ["I18N-001"]="cd worktrees/issues/I18N-001_unify-error-messages/trading-platform && echo '=== 国際化: メッセージ辞庫作成 ===' && mkdir -p app/lib/messages"
  ["ARCH-001"]="cd worktrees/issues/ARCH-001_indexeddb-migration/trading-platform && echo '=== DB移行: ロールバック機構 ===' && cat app/lib/api/idb-migrations.ts | head -50"
  ["DEVOPS-001"]="cd worktrees/issues/DEVOPS-001_coverage-visualization && echo '=== 可視化: Codecov設定 ===' && cat .github/workflows/test.yml 2>/dev/null | head -20 || echo 'テストワークフロー作成が必要'"
)

# 各worktreeの状態を表示
echo "各worktreeの現在の状態："
echo ""

for key in "${!WORKTREES[@]}"; do
  dir="${key}"
  echo "📁 $dir"
  echo "   ${WORKTREES[$key]}"
  echo ""
done

echo "=========================================="
echo ""
echo "❓ どのように進めますか？"
echo ""
echo "1. 全worktreeを別々のターミナルで開く（推奨）"
echo "   → 以下のコマンドを各ターミナルで実行："
echo ""
for key in "${!WORKTREES[@]}"; do
  dir="${key}"
  path="worktrees/issues/${dir}"
  echo "  Terminal $(( ${#WORKTREES[@]} - ${key} + 1 )): cd $path && code ."
done
echo ""
echo "2. 一つのスクリプトで順に実行（順序を制御）"
echo "   → ./start-parallel-implementation.sh を実行（各コマンドが順次実行）"
echo ""
echo "3. 特定のworktreeだけ実行"
echo "   → cd worktrees/issues/ISSUE-NAME して手動で作業"
echo ""
echo "選択してください (1/2/3 または各worktree名):"

read -p "> " choice

case $choice in
  1)
    echo ""
    echo "各ターミナルで以下のコマンドを実行してください："
    for key in "${!WORKTREES[@]}"; do
      dir="${key}"
      path="worktrees/issues/${dir}"
      if [ -d "$path" ]; then
        echo ""
        echo "=== $dir ==="
        echo "cd $path"
        if [[ "$key" == "SECURITY-001" ]]; then
          echo "cd trading-platform"
        elif [[ "$key" == "SECURITY-002" ]]; then
          echo "# ディレクトリに注意"
        elif [[ "$key" == "SECURITY-003" ]]; then
          echo "cd backend"
        else
          echo "cd trading-platform"
        fi
        echo "# 実装を開始"
      else
        echo "⚠️  $path がありません"
      fi
    done
    ;;
  2)
    echo "順次実行を開始します..."
    for key in "${!WORKTREES[@]}"; do
      echo ""
      echo "----------------------------------------"
      echo "Processing: $key"
      echo "----------------------------------------"
      eval "${WORKTREES[$key]}" || true
      read -p "Press Enter to continue to next worktree..." 
    done
    ;;
  3)
    echo "特定のworktree名を入力してください (SECURITY-001, SECURITY-002, ...):"
    read -p "> " specific
    if [ -n "$specific" ]; then
      path="worktrees/issues/$specific"
      if [ -d "$path" ]; then
        echo "Opening $specific..."
        if [[ "$specific" == "SECURITY-001" || "$specific" == "SECURITY-002" || "$specific" == "TEST-001" || "$specific" == "TEST-002" || "$specific" == "PERFORMANCE-001" || "$specific" == "I18N-001" || "$specific" == "ARCH-001" ]]; then
          (cd "$path/trading-platform" && bash)
        elif [[ "$specific" == "SECURITY-003" ]]; then
          (cd "$path/backend" && bash)
        else
          (cd "$path" && bash)
        fi
      else
        echo "Directory not found: $path"
      fi
    fi
    ;;
  *)
    echo "無効な選択です"
    ;;
esac

echo ""
echo "完了！各worktreeで作業を進めてください。"
