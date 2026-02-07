#!/bin/bash
# リポジトリサイズ緊急クリーンアップスクリプト

echo "=========================================="
echo "🚨 リポジトリサイズ緊急クリーンアップ"
echo "=========================================="
echo ""

# 現在のサイズを確認
echo "📊 現在のリポジトリサイズ:"
du -sh .git
echo ""

# 大きなファイルを確認
echo "🔍 上位10個の大きなファイル:"
git rev-list --objects --all | \
    git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
    sed -n 's/^blob //p' | \
    sort --numeric-sort --key=2 --reverse | \
    head -10 | \
    awk '{printf "  %.2f MB\t%s\n", $2/1024/1024, $3}'

echo ""
echo "⚠️  注意: git-filter-repoが使用できない環境のため、"
echo "   以下の手動手順を実行してください:"
echo ""
echo "【方法1: BFG Repo-Cleanerを使用】"
echo "1. Javaがインストールされていることを確認"
echo "2. BFGをダウンロード:"
echo "   curl -O https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar"
echo ""
echo "3. BFGを実行:"
echo "   java -jar bfg-1.14.0.jar --delete-folders .next"
echo "   git reflog expire --expire=now --all"
echo "   git gc --prune=now --aggressive"
echo ""
echo "4. 強制プッシュ:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "【方法2: リポジトリ再作成】"
echo "（チームに影響を与えない場合）"
echo ""
echo "=========================================="
