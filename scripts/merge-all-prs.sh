#!/bin/bash

# 全ての未マージなPRブランチを自動マージするスクリプト
# 使用方法: ./scripts/merge-all-prs.sh

set -e

# 色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

main() {
    log_info "未マージなPRのマージプロセスを開始します..."
    
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        log_error "mainブランチで実行してください"
        exit 1
    fi

    log_info "リモートの最新情報を取得中..."
    git fetch origin

    # 未マージなPRブランチのリストを取得
    prs=$(git branch -r --no-merged main | grep 'origin/pr/' | sed 's/^[[:space:]]*//')
    
    if [ -z "$prs" ]; then
        log_success "マージすべきPRはありません。"
        exit 0
    fi

    merged_count=0
    skipped_count=0
    
    for pr in $prs; do
        log_info "マージを試行中: $pr"
        
        # マージ試行
        if git merge --no-ff --no-commit "$pr" 2>/dev/null; then
            log_success "マージ成功 (コンフリクトなし): $pr"
            git commit -m "Merge $pr: 自動マージ"
            merged_count=$((merged_count + 1))
        else
            log_warning "コンフリクト発生のためスキップ: $pr"
            git merge --abort
            skipped_count=$((skipped_count + 1))
        fi
    done

    echo ""
    echo "=========================================="
    log_success "マージ完了レポート"
    echo "=========================================="
    echo "成功: $merged_count"
    echo "スキップ (コンフリクトあり): $skipped_count"
    echo "=========================================="
    
    if [ $merged_count -gt 0 ]; then
        log_info "変更をプッシュするには: git push origin main"
    fi
}

main "$@"
