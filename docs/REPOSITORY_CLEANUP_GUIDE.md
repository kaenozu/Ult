# Repository Cleanup Guide

## Problem
The `.git` directory has grown to 615MB, exceeding the recommended 500MB threshold. This is primarily due to temporary and build files that were accidentally committed to the repository history.

## Files Identified for Removal

### Temporary Build/Test Output Files (should never be in git)
- `trading-platform/build-after-fix.txt` (106KB)
- `trading-platform/lint-output.txt` (49KB)
- `trading-platform/lint-fix-output.txt` (48KB)
- `trading-platform/tsc-*.txt` files (7 files)

### Backup Files (should never be in git)
- `trading-platform/**/*.bak` (7 files)
- `trading-platform/**/*.bak2`

### Verification Screenshots (should be stored elsewhere)
- `verification/notification_settings.png` (108KB)
- `verification/error.png` (97KB)

## Steps Completed

### 1. Updated .gitignore
The `.gitignore` file has been updated to prevent these files from being committed again:

```gitignore
# Temporary and build files
*.bak
*.bak2
*.backup
tsc-*.txt
*-output.txt
*-errors.txt
lint-*.txt
build-*.txt

# Verification and screenshots
verification/
screenshots/
*.png
*.jpg
*.jpeg
!trading-platform/public/**/*.png
!trading-platform/public/**/*.jpg
!trading-platform/public/**/*.jpeg
```

### 2. Removed Files from Working Tree
All temporary/build files have been removed from the current working tree.

## Cleaning Git History

To remove these files from git history and reduce the repository size, follow these steps:

### Option 1: Using git-filter-repo (Recommended)

**⚠️ WARNING: This rewrites git history. Coordinate with all team members before proceeding.**

1. **Backup your repository** (just in case):
   ```bash
   cd /path/to/Ult
   git clone --mirror . ../Ult-backup.git
   ```

2. **Install git-filter-repo**:
   ```bash
   pip install git-filter-repo
   ```

3. **Create a list of paths to remove**:
   ```bash
   cat > /tmp/paths-to-remove.txt << 'EOF'
trading-platform/build-after-fix.txt
trading-platform/lint-output.txt
trading-platform/lint-fix-output.txt
trading-platform/tsc-current-full.txt
trading-platform/tsc-output-final.txt
trading-platform/tsc-errors.txt
trading-platform/tsc-new.txt
trading-platform/tsc-output.txt
trading-platform/tsc-current.txt
trading-platform/tsc-output-current.txt
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
   ```

4. **Run git-filter-repo**:
   ```bash
   git filter-repo --invert-paths --paths-from-file /tmp/paths-to-remove.txt --force
   ```

5. **Verify the size reduction**:
   ```bash
   du -sh .git
   git count-objects -vH
   ```

6. **Force push to remote** (⚠️ requires coordination):
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

7. **Team members must re-clone**:
   All team members need to clone fresh copies of the repository:
   ```bash
   cd /path/to/projects
   rm -rf Ult
   git clone https://github.com/kaenozu/Ult.git
   ```

### Option 2: Using BFG Repo-Cleaner (Alternative)

1. **Download BFG**:
   ```bash
   wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
   ```

2. **Remove large files**:
   ```bash
   java -jar bfg-1.14.0.jar --delete-files "{build-after-fix.txt,lint-*.txt,tsc-*.txt,*.bak,*.bak2}" .
   java -jar bfg-1.14.0.jar --delete-folders verification .
   ```

3. **Clean up**:
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

## Post-Cleanup Verification

After cleaning, verify:

1. **Repository size**:
   ```bash
   du -sh .git
   # Should be < 500MB
   ```

2. **Build still works**:
   ```bash
   cd trading-platform
   npm install
   npm run build
   npm test
   ```

3. **No broken references**:
   ```bash
   git fsck --full
   ```

## Prevention

The updated `.gitignore` should prevent these files from being committed again. Additionally:

1. **Pre-commit hooks**: Consider adding a pre-commit hook to check file sizes
2. **Git LFS**: Use Git LFS for any necessary large binary files
3. **CI/CD**: The `repo-size-check.yml` workflow will alert if the repository grows too large
4. **Code reviews**: Review files being committed in PRs

## References

- [git-filter-repo documentation](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git LFS](https://git-lfs.github.com/)
