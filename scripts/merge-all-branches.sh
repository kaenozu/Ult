#!/bin/bash

# Gitリポジトリのすべてのブランチを安全にマージするスクリプト
# 使用方法: ./scripts/merge-all-branches.sh

set -e  # エラーが発生したらスクリプトを停止

# 色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# マージすべきブランチの優先順位リスト
# カテゴリ別にグループ化
HIGH_PRIORITY_BRANCHES=(
    "fix/ci-lint-errors"
    "fix/build-and-lint-errors"
    "fix/build-and-ts"
    "fix/typescript-errors"
    "fix/mvp-stabilization"
    "fix/system-stabilization-final"
    "fix/tests-final-2"
    "fix/test-env"
    "fix/quality-and-cleanup"
)

MEDIUM_PRIORITY_BRANCHES=(
    "refactor/code-quality-improvements"
    "refactor/code-quality-enhancement"
    "refactor/type-safety"
    "refactor/magic-numbers-extraction"
    "refactor/magic-numbers-extraction-pr"
    "refactor/backend-api"
    "refactor-signal-panel-6907079868566096462"
    "refactor/core-services-store-13647055190934339026"
    "refactor/singleton-and-error-handling"
    "refactor/update-skills-and-platform"
)

FEATURE_BRANCHES=(
    "feature/trading-platform-mvp"
    "feature/ai-prediction-error-display"
    "feature/ai-self-correction"
    "feature/api-performance-monitor"
    "feature/chart-ui-improvements"
    "feature/code-quality-and-readme"
    "feature/config-management-refactor"
    "feature/enhanced-testing"
    "feature/ml-ensemble-prediction"
    "feature/persistent-stock-db"
    "feature/trade-journal-analyzer"
    "feature/trading-intelligence-suite"
)

PERFORMANCE_BRANCHES=(
    "bolt/optimize-store-selectors-4775789442959145478"
    "bolt/optimize-page-renders-5177960276316492258"
    "bolt/optimize-stock-chart-11764159027938189162"
    "bolt/optimize-stock-table-renders-6811503498995386686"
    "bolt-optimize-stocktable-14367542531936839213"
    "bolt-optimize-usechartdata-map-lookup-17640028551597559804"
    "perf/backtest-optimization-14983486655620126981"
    "perf/memory-leaks-and-test-coverage"
    "perf/optimize-render-selectors-5715367787258029266"
)

SECURITY_BRANCHES=(
    "sentinel/rate-limit-market-api-9978099823618813567"
    "sentinel-fix-alpha-vantage-security-14024923650376383263"
    "sentinel-fix-market-api-exposure-15270884287123636248"
    "sentinel/fix-market-api-validation-3499725779458618768"
    "security/api-key-protection"
)

ACCESSIBILITY_BRANCHES=(
    "palette-bottom-panel-aria-152332587082508800"
    "palette-mobile-sidebar-a11y-3472329217493109631"
    "palette-orderpanel-a11y-7042432316388344292"
    "palette-signal-panel-a11y-13321066371711121796"
    "palette-ux-empty-state-6904396643108971133"
    "palette-ux-improvements-14868249237974140758"
)

# すべてのブランチを結合
ALL_BRANCHES=(
    "${HIGH_PRIORITY_BRANCHES[@]}"
    "${MEDIUM_PRIORITY_BRANCHES[@]}"
    "${FEATURE_BRANCHES[@]}"
    "${PERFORMANCE_BRANCHES[@]}"
    "${SECURITY_BRANCHES[@]}"
    "${ACCESSIBILITY_BRANCHES[@]}"
)

# コンフリクトが発生した場合の処理
handle_conflict() {
    local branch=$1
    log_error "コンフリクトが発生しました: $branch"
    
    echo ""
    echo "以下のオプションから選択してください:"
    echo "1) コンフリクトを手動で解決して続行"
    echo "2) マージを中止して元の状態に戻す"
    echo "3) 現在のブランチをスキップして次へ進む"
    echo ""
    
    read -p "選択 (1/2/3): " choice
    
    case $choice in
        1)
            log_info "コンフリクトを手動で解決してください..."
            log_info "解決後、以下のコマンドを実行して続行してください:"
            echo "  git add <解決したファイル>"
            echo "  git commit"
            echo "  ./scripts/merge-all-branches.sh --continue"
            exit 1
            ;;
        2)
            log_warning "マージを中止します..."
            git merge --abort
            exit 1
            ;;
        3)
            log_warning "現在のブランチをスキップします..."
            git merge --abort
            return 1
            ;;
        *)
            log_error "無効な選択です"
            exit 1
            ;;
    esac
}

# ブランチをマージする関数
merge_branch() {
    local branch=$1
    local remote_branch="origin/$branch"
    
    log_info "ブランチをマージ中: $branch"
    
    # リモートブランチが存在するか確認
    if ! git show-ref --verify --quiet "refs/remotes/$remote_branch"; then
        log_warning "リモートブランチが存在しません: $remote_branch"
        return 0
    fi
    
    # マージを試みる
    if git merge --no-ff --no-commit "$remote_branch" 2>/dev/null; then
        # コンフリクトがない場合
        log_success "マージ成功: $branch"
        
        # ビルドとテストを実行（オプション）
        if [ "$SKIP_TESTS" != "true" ]; then
            log_info "ビルドとテストを実行中..."
            if npm run build && npm test; then
                log_success "ビルドとテスト成功"
            else
                log_error "ビルドまたはテストが失敗しました"
                git merge --abort
                return 1
            fi
        fi
        
        # マージをコミット
        git commit -m "マージ: $remote_branch をmainにマージ"
        log_success "マージ完了: $branch"
        return 0
    else
        # コンフリクトがある場合
        handle_conflict "$branch"
        return $?
    fi
}

# メイン処理
main() {
    log_info "マージプロセスを開始します..."
    
    # 現在のブランチを確認
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        log_error "mainブランチに切り替えてください"
        exit 1
    fi
    
    # リモートの最新情報を取得
    log_info "リモートの最新情報を取得中..."
    git fetch origin
    
    # 作業ディレクトリがクリーンか確認
    if [ -n "$(git status --porcelain)" ]; then
        log_error "作業ディレクトリがクリーンではありません。変更をコミットまたはスタッシュしてください。"
        exit 1
    fi
    
    # マージ済みブランチのリスト
    merged_branches=()
    skipped_branches=()
    failed_branches=()
    
    # 各ブランチをマージ
    for branch in "${ALL_BRANCHES[@]}"; do
        echo ""
        echo "=========================================="
        echo "ブランチ: $branch"
        echo "=========================================="
        
        if merge_branch "$branch"; then
            merged_branches+=("$branch")
        else
            if [ $? -eq 1 ]; then
                failed_branches+=("$branch")
            else
                skipped_branches+=("$branch")
            fi
        fi
    done
    
    # 結果を表示
    echo ""
    echo "=========================================="
    echo "マージ結果"
    echo "=========================================="
    echo ""
    
    if [ ${#merged_branches[@]} -gt 0 ]; then
        log_success "マージ成功したブランチ (${#merged_branches[@]}):"
        for branch in "${merged_branches[@]}"; do
            echo "  ✓ $branch"
        done
    fi
    
    if [ ${#skipped_branches[@]} -gt 0 ]; then
        log_warning "スキップしたブランチ (${#skipped_branches[@]}):"
        for branch in "${skipped_branches[@]}"; do
            echo "  ⊘ $branch"
        done
    fi
    
    if [ ${#failed_branches[@]} -gt 0 ]; then
        log_error "マージ失敗したブランチ (${#failed_branches[@]}):"
        for branch in "${failed_branches[@]}"; do
            echo "  ✗ $branch"
        done
    fi
    
    echo ""
    
    if [ ${#merged_branches[@]} -gt 0 ]; then
        log_info "変更をリモートにプッシュする準備ができました:"
        echo "  git push origin main"
    fi
}

# スクリプトの実行
main "$@"
