#!/usr/bin/env bash
set -e

echo "=========================================="
echo "Committing & Pushing All Worktrees"
echo "=========================================="
echo ""

cd worktrees/issues

# 各worktreeでコミット
for d in */; do
  name=$(basename "$d")
  echo "📦 $name"
  
  cd "$d"
  
  # Check if there are changes
  if git status --porcelain | grep -q .; then
    git add -A
    git commit -m "feat: implement $(echo $name | sed 's/_[^-]*/-/g' | tr '[:upper:]' '[:lower:]')" --allow-empty
    echo "  ✓ Committed"
    
    # Push
    branch=$(git branch --show-current)
    git push origin "$branch" 2>&1 | grep -E "hint|done|error" || echo "  ✓ Pushed to $branch"
  else
    echo "  ℹ️ No changes to commit"
  fi
  
  cd - > /dev/null
  echo ""
done

echo "=========================================="
echo "✅ All worktrees committed and pushed!"
echo "=========================================="
