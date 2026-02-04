#!/bin/bash
#
# Git History Cleanup Script
# ==========================
# This script removes large temporary files from Git history to reduce repository size.
#
# WARNING: This script rewrites Git history! Use with caution.
# - Backup your repository before running
# - Coordinate with team members
# - Force push will be required after running
#
# Files to remove from history:
# - Build output files (*-output.txt, tsc-*.txt)
# - Lint reports (eslint-*.txt, lint-*.txt)
# - Test results (test-results.txt)
# - Other temporary build artifacts
#

set -e  # Exit on error

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "=========================================="
echo "Git History Cleanup Script"
echo "=========================================="
echo ""

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo "ERROR: git-filter-repo is not installed."
    echo "Install it with: pip3 install git-filter-repo"
    echo "Or follow instructions at: https://github.com/newren/git-filter-repo"
    exit 1
fi

# Show current repository size
echo "Current repository size:"
du -sh .git
echo ""

# List files to be removed
FILES_TO_REMOVE=(
    "trading-platform/eslint-output.txt"
    "trading-platform/build-after-fix.txt"
    "trading-platform/lint-output.txt"
    "trading-platform/lint-fix-output.txt"
    "trading-platform/build-output.txt"
    "trading-platform/eslint-report.txt"
    "trading-platform/eslint-any-check.txt"
    "trading-platform/test-results.txt"
    "trading-platform/error-files.txt"
    "trading-platform/tsc-current-full.txt"
    "trading-platform/tsc-current.txt"
    "trading-platform/tsc-errors.txt"
    "trading-platform/tsc-new.txt"
    "trading-platform/tsc-output-current.txt"
    "trading-platform/tsc-output-final.txt"
    "trading-platform/tsc-output.txt"
)

echo "Files to remove from history:"
for file in "${FILES_TO_REMOVE[@]}"; do
    echo "  - $file"
done
echo ""

# Confirmation prompt
read -p "This will rewrite Git history. Continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1: Backup remote configuration..."
git remote -v > /tmp/git-remotes-backup.txt
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

echo "Step 2: Creating file list for git-filter-repo..."
FILTER_FILE="/tmp/git-filter-repo-paths.txt"
> "$FILTER_FILE"
for file in "${FILES_TO_REMOVE[@]}"; do
    echo "$file" >> "$FILTER_FILE"
done

echo "Step 3: Running git-filter-repo to remove files from history..."
echo "This may take a few minutes..."
git-filter-repo --invert-paths --paths-from-file "$FILTER_FILE" --force

echo "Step 4: Restoring remote configuration..."
if [[ -n "$REMOTE_URL" ]]; then
    git remote add origin "$REMOTE_URL"
    echo "Remote 'origin' restored: $REMOTE_URL"
fi

echo ""
echo "=========================================="
echo "Cleanup complete!"
echo "=========================================="
echo ""
echo "New repository size:"
du -sh .git
echo ""

# Calculate size reduction
echo "Size comparison:"
git count-objects -vH

echo ""
echo "=========================================="
echo "IMPORTANT: Next Steps"
echo "=========================================="
echo ""
echo "1. Review the changes:"
echo "   git log --oneline -10"
echo ""
echo "2. Force push to update remote (CAUTION!):"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. Notify team members to:"
echo "   - Backup their work"
echo "   - Delete their local repository"
echo "   - Clone the repository fresh"
echo ""
echo "4. Optional: Run garbage collection:"
echo "   git reflog expire --expire=now --all"
echo "   git gc --prune=now --aggressive"
echo ""
echo "For more info: https://github.com/newren/git-filter-repo"
echo ""
