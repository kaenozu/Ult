# Git Repository Cleanup Guide

## Problem Statement

The `.git` directory size exceeded the recommended 500MB threshold due to large temporary files being committed to the repository history.

## Root Cause

Several large build and lint output files were accidentally committed:

| File | Size | Purpose |
|------|------|---------|
| `trading-platform/eslint-output.txt` | 1.2 MB | ESLint output (temporary) |
| `trading-platform/build-after-fix.txt` | 105 KB | Build output (temporary) |
| `trading-platform/lint-output.txt` | 48 KB | Lint output (temporary) |
| `trading-platform/lint-fix-output.txt` | 48 KB | Lint fix output (temporary) |
| Various `tsc-*.txt` files | Multiple | TypeScript compiler output (temporary) |

These files are **temporary build artifacts** that should never be committed to version control.

## Solution Implemented

### 1. Prevention (Completed ✅)

Updated `.gitignore` to prevent future commits of these files:

```gitignore
# Build and lint output files (temporary)
*-output.txt
eslint-output.txt
eslint-report.txt
eslint-any-check.txt
lint-output.txt
lint-fix-output.txt
build-output.txt
build-after-fix.txt
tsc-output*.txt
tsc-errors.txt
tsc-current*.txt
tsc-new.txt
test-results.txt
error-files.txt
```

### 2. Cleanup Current Working Tree (Completed ✅)

Removed all temporary files from the current working tree:
- 16 files removed totaling ~1.4 MB

### 3. History Cleanup (Manual Step Required)

To remove these files from Git history and reduce repository size, use the provided script.

## Running the Cleanup Script

### Prerequisites

1. **Install git-filter-repo**:
   ```bash
   pip3 install git-filter-repo
   ```
   Or follow: https://github.com/newren/git-filter-repo

2. **Backup your repository**:
   ```bash
   cd /path/to/your/clone
   git clone --mirror . ../Ult-backup.git
   ```

3. **Coordinate with team**: Notify all team members before proceeding.

### Execute Cleanup

```bash
cd /path/to/repository
./scripts/cleanup-git-history.sh
```

The script will:
1. Show current repository size
2. List files to be removed
3. Ask for confirmation
4. Remove files from entire Git history
5. Show new repository size and next steps

### After Running the Script

1. **Review changes**:
   ```bash
   git log --oneline -10
   git count-objects -vH
   ```

2. **Force push to remote** (⚠️ CAUTION):
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

3. **Notify team members** to:
   - Backup their local work
   - Delete their local repository clone
   - Re-clone from the remote
   - **DO NOT** try to merge or rebase old branches

4. **Optional - Aggressive cleanup**:
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

## Expected Results

After cleanup:
- ✅ `.git` directory size reduced significantly
- ✅ No temporary build files in repository history
- ✅ Future commits prevented by updated `.gitignore`
- ✅ Repository stays under 500MB threshold

## Best Practices Going Forward

### 1. Always Check Before Committing
```bash
git status
git diff --cached
```

### 2. Use `.gitignore` Effectively
- Keep `.gitignore` up to date
- Review it before adding new types of files
- Test with: `git check-ignore <file>`

### 3. Regular Repository Maintenance
```bash
# Check repository size periodically
du -sh .git

# List largest files in history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | sort -nrk2 | head -20
```

### 4. Pre-commit Hooks
Consider using git hooks to prevent large files:
```bash
# .git/hooks/pre-commit
#!/bin/bash
# Prevent committing files larger than 1MB
git diff --cached --name-only | while read file; do
  size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
  if [ $size -gt 1048576 ]; then
    echo "Error: File $file is larger than 1MB ($size bytes)"
    exit 1
  fi
done
```

## Git LFS Alternative

For legitimately large binary files (images, videos, datasets), use Git LFS:

```bash
# Install Git LFS
git lfs install

# Track large file types
git lfs track "*.png"
git lfs track "*.jpg"
git lfs track "*.pdf"

# Commit .gitattributes
git add .gitattributes
git commit -m "Configure Git LFS"
```

## Troubleshooting

### Issue: git-filter-repo not found
```bash
# Install using pip
pip3 install git-filter-repo

# Or download directly
curl -o /usr/local/bin/git-filter-repo \
  https://raw.githubusercontent.com/newren/git-filter-repo/main/git-filter-repo
chmod +x /usr/local/bin/git-filter-repo
```

### Issue: Remote removed after git-filter-repo
```bash
# Re-add remote
git remote add origin https://github.com/kaenozu/Ult.git
```

### Issue: Team members have conflicts after force push
Team members should:
```bash
# DO NOT try to merge or pull
# Instead, start fresh:
git fetch origin
git reset --hard origin/main  # or your branch name
```

## References

- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git LFS](https://git-lfs.github.com/)
- [Atlassian: Maintaining a Git Repository](https://www.atlassian.com/git/tutorials/git-gc)

## Support

For questions or issues:
1. Check this documentation
2. Review git-filter-repo documentation
3. Open an issue in the repository
4. Contact the repository maintainers

---

**Last Updated**: 2026-02-04  
**Script Location**: `/scripts/cleanup-git-history.sh`  
**Related Issue**: Repository size optimization
