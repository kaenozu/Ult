#!/bin/bash
#
# Repository Size Cleanup Script
# リポジトリサイズ緊急削減スクリプト
#

set -e

echo "=========================================="
echo "🚨 Repository Size Emergency Cleanup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo "📁 Repository: $REPO_ROOT"
echo ""

# Step 1: Check current size
echo "📊 Step 1: Checking current repository size..."
echo "------------------------------------------"

# Get .git directory size
if command -v du &> /dev/null; then
    GIT_SIZE=$(du -sh .git 2>/dev/null | cut -f1)
    echo -e "Current .git size: ${YELLOW}$GIT_SIZE${NC}"
fi

# Count large files
echo ""
echo "🔍 Finding large files in history..."
echo "------------------------------------------"

git rev-list --objects --all | \
    git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
    sed -n 's/^blob //p' | \
    sort --numeric-sort --key=2 --reverse | \
    head -10 | \
    while read hash size path; do
        size_mb=$(echo "scale=2; $size / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
        printf "  %6s MB  %s\n" "$size_mb" "$path"
    done

echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "   Make sure to:"
echo "   1. Notify all team members"
echo "   2. Create a backup"
echo "   3. Execute during low-activity period"
echo ""

# Step 2: Confirmation
read -p "Do you want to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
    exit 0
fi

echo ""
echo "📦 Step 2: Installing git-filter-repo..."
echo "------------------------------------------"

if ! command -v git-filter-repo &> /dev/null; then
    if command -v pip &> /dev/null; then
        pip install git-filter-repo
    elif command -v pip3 &> /dev/null; then
        pip3 install git-filter-repo
    else
        echo -e "${RED}Error: pip not found. Please install git-filter-repo manually.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ git-filter-repo installed${NC}"

# Step 3: Remove .next/ from history
echo ""
echo "🗑️  Step 3: Removing .next/ directory from git history..."
echo "------------------------------------------"

git filter-repo --path .next --invert-paths --force

echo -e "${GREEN}✓ .next/ removed from history${NC}"

# Step 4: Remove other large artifacts
echo ""
echo "🗑️  Step 4: Removing other build artifacts..."
echo "------------------------------------------"

# Remove log files if they exist
git filter-repo --path-glob '*.log' --invert-paths --force 2>/dev/null || true
git filter-repo --path-glob 'test_output*.txt' --invert-paths --force 2>/dev/null || true
git filter-repo --path-glob '*-output.txt' --invert-paths --force 2>/dev/null || true

echo -e "${GREEN}✓ Log files removed${NC}"

# Step 5: Force push
echo ""
echo "🚀 Step 5: Force pushing to remote..."
echo "------------------------------------------"

echo "Run the following commands manually:"
echo ""
echo "  git push origin --force --all"
echo "  git push origin --force --tags"
echo ""

read -p "Do you want to execute force push now? (yes/no): " PUSH_CONFIRM
if [ "$PUSH_CONFIRM" == "yes" ]; then
    git push origin --force --all
    git push origin --force --tags
    echo -e "${GREEN}✓ Force push completed${NC}"
else
    echo -e "${YELLOW}Force push skipped. Run manually when ready.${NC}"
fi

# Step 6: Verification
echo ""
echo "✅ Step 6: Verification"
echo "------------------------------------------"

if command -v du &> /dev/null; then
    NEW_SIZE=$(du -sh .git 2>/dev/null | cut -f1)
    echo -e "New .git size: ${GREEN}$NEW_SIZE${NC}"
fi

echo ""
echo "📋 Next Steps:"
echo "------------------------------------------"
echo "1. Notify all team members about the history rewrite"
echo "2. Team members should run:"
echo "   git fetch origin"
echo "   git reset --hard origin/main"
echo "3. Update any open pull requests"
echo "4. Update CI/CD pipelines if needed"
echo ""
echo "=========================================="
echo "✨ Cleanup completed!"
echo "=========================================="
