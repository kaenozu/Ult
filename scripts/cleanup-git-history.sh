#!/bin/bash
#
# Git Repository History Cleanup Script
# =====================================
# This script removes large temporary files from Git history to reduce repository size.
#
# WARNING: This script rewrites Git history! Use with caution.
# - Backup your repository before running
# - Coordinate with team members
# - Force push will be required after running
#

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "============================================"
echo "Git Repository History Cleanup Script"
echo "============================================"
echo ""
echo "WARNING: This script will rewrite git history."
echo "Make sure all team members have committed their work."
echo ""
echo "This script will remove temporary/build files from git history."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Step 1: Checking prerequisites..."

# Check if git-filter-repo is installed
if ! git filter-repo --help >/dev/null 2>&1; then
    echo "ERROR: git-filter-repo is not installed."
    echo "Install it with: pip3 install git-filter-repo"
    echo "Or follow instructions at: https://github.com/newren/git-filter-repo"
    exit 1
fi

echo ""
echo "Step 2: Creating backup..."
BACKUP_DIR="../Ult-backup-$(date +%Y%m%d-%H%M%S).git"
git clone --mirror . "$BACKUP_DIR"
echo "Backup created at: $BACKUP_DIR"

echo ""
echo "Step 3: Checking current repository size..."
BEFORE_SIZE=$(du -sm .git | cut -f1)
echo "Current .git size: ${BEFORE_SIZE}MB"

echo ""
echo "Step 4: Creating list of files to remove..."
cat > /tmp/git-cleanup-paths.txt << 'EOF'
trading-platform/eslint-output.txt
trading-platform/build-after-fix.txt
trading-platform/lint-output.txt
trading-platform/lint-fix-output.txt
trading-platform/build-output.txt
trading-platform/eslint-report.txt
trading-platform/eslint-any-check.txt
trading-platform/test-results.txt
trading-platform/error-files.txt
trading-platform/tsc-current-full.txt
trading-platform/tsc-current.txt
trading-platform/tsc-errors.txt
trading-platform/tsc-new.txt
trading-platform/tsc-output-current.txt
trading-platform/tsc-output-final.txt
trading-platform/tsc-output.txt
trading-platform/app/hooks/useSymbolAccuracy.ts.bak
trading-platform/app/lib/performance-quickstart.ts.bak
trading-platform/app/lib/backtest/RealisticBacktestEngine.ts.bak2
trading-platform/app/lib/performance/utils.ts.bak
trading-platform/app/lib/aiAnalytics/IntegrationExample.ts.bak
trading-platform/eslint.config.js.bak
trading-platform/package.json.bak
verification/notification_settings.png
verification/error.png
EOF

echo "Files to remove:"
cat /tmp/git-cleanup-paths.txt
echo ""

echo "Step 5: Running git-filter-repo..."
echo "This may take a few minutes..."

git filter-repo --invert-paths --paths-from-file /tmp/git-cleanup-paths.txt --force

echo ""
echo "Step 6: Garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "Step 7: Checking new repository size..."
AFTER_SIZE=$(du -sm .git | cut -f1)
echo "New .git size: ${AFTER_SIZE}MB"
SAVED=$((BEFORE_SIZE - AFTER_SIZE))
echo "Space saved: ${SAVED}MB"

echo ""
echo "Step 8: Verifying repository integrity..."
git fsck --full

echo ""
echo "============================================"
echo "Cleanup completed successfully."
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Review the changes and ensure everything looks correct"
echo "2. Force push to remote: git push origin --force --all"
echo "3. Force push tags: git push origin --force --tags"
echo "4. Notify team members to re-clone the repository"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "If you encounter any issues, you can restore from backup:"
echo "  cd .. && rm -rf Ult && git clone $BACKUP_DIR Ult"
echo ""