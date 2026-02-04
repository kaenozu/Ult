# Quick Reference: Repository Size Management

## Current Status (as of 2026-02-04)

### ✅ Completed Actions
1. **Updated `.gitignore`** - Added patterns to exclude build/lint output files
2. **Removed temporary files** - Cleaned 16 files (~1.4 MB) from working tree
3. **Created cleanup script** - `/scripts/cleanup-git-history.sh`
4. **Documentation** - Full guide in `/docs/GIT_CLEANUP_GUIDE.md`

### ⏳ Pending Actions (Repository Maintainer Required)

**To complete repository size reduction**, run:

```bash
# 1. Install git-filter-repo (one-time setup)
pip3 install git-filter-repo

# 2. Run the cleanup script
./scripts/cleanup-git-history.sh

# 3. After review, force push (CAUTION!)
git push origin --force --all
git push origin --force --tags
```

## Why These Files Were Committed

These temporary files were likely committed during development/debugging:
- `eslint-output.txt` - ESLint full output
- `tsc-*.txt` - TypeScript compiler errors
- `*-output.txt` - Various build and test outputs

They should have been excluded by `.gitignore` from the start.

## Prevention Measures Now in Place

### Updated .gitignore Rules
```gitignore
# Build and lint output files (temporary)
*-output.txt
eslint-output.txt
lint-output.txt
build-output.txt
tsc-output*.txt
tsc-errors.txt
test-results.txt
error-files.txt
```

### Files Now Excluded
All temporary build, lint, and test output files are now automatically ignored.

## Quick Commands

### Check Repository Size
```bash
du -sh .git
git count-objects -vH
```

### Find Large Files in History
```bash
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | sort -nrk2 | head -20
```

### Verify .gitignore Works
```bash
# Create a test file
echo "test" > trading-platform/test-output.txt

# Check if it's ignored
git status
git check-ignore -v trading-platform/test-output.txt

# Clean up
rm trading-platform/test-output.txt
```

## Team Communication Template

When ready to run history cleanup, notify team:

```
Subject: [ACTION REQUIRED] Git Repository History Cleanup

Team,

We're performing a Git history cleanup to reduce repository size by removing 
accidentally committed temporary build files.

Timeline:
- [DATE/TIME]: Running cleanup script
- [DATE/TIME]: Force pushing to remote

Action Required:
1. Push all your uncommitted work
2. After force push, delete your local clone
3. Clone repository fresh: git clone <repo-url>
4. DO NOT try to merge or rebase old branches

Questions? See: docs/GIT_CLEANUP_GUIDE.md
```

## Monitoring

### Regular Size Checks
Add to monthly maintenance checklist:
```bash
# Check .git size
du -sh .git

# Alert if over 400MB
if [ $(du -sb .git | cut -f1) -gt 419430400 ]; then
    echo "WARNING: .git directory exceeds 400MB"
fi
```

### CI Integration (Optional)
Add to GitHub Actions workflow:
```yaml
- name: Check Repository Size
  run: |
    GIT_SIZE=$(du -sb .git | cut -f1)
    MAX_SIZE=524288000  # 500MB in bytes
    if [ $GIT_SIZE -gt $MAX_SIZE ]; then
      echo "::warning::.git directory size ($GIT_SIZE bytes) exceeds threshold"
    fi
```

## Related Files

- **Script**: `/scripts/cleanup-git-history.sh`
- **Documentation**: `/docs/GIT_CLEANUP_GUIDE.md`
- **Configuration**: `/.gitignore`

## Rollback Plan

If issues occur after force push:

```bash
# 1. Restore from backup
cd ../Ult-backup.git
git clone --mirror . ../Ult-restored

# 2. Or revert to previous state
git reflog
git reset --hard <commit-before-cleanup>
git push origin --force --all
```

## References

- Full guide: `/docs/GIT_CLEANUP_GUIDE.md`
- git-filter-repo: https://github.com/newren/git-filter-repo
- GitHub docs: https://docs.github.com/en/repositories/working-with-files/managing-large-files

---

**Created**: 2026-02-04  
**Owner**: Repository Maintainers  
**Review**: Quarterly
