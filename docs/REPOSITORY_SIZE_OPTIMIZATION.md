# Repository Size Optimization Guide

## Overview

This document outlines the measures taken to optimize and maintain a healthy repository size, preventing issues with slow clones, fetches, and CI pipeline delays.

## Current Status

The repository has been optimized to maintain a manageable size by:
1. Removing tracked files that should be ignored
2. Enhancing .gitignore patterns
3. Implementing pre-commit hooks
4. Setting up automated size monitoring

## Files Removed from Git History

The following types of files have been removed from git tracking:

### Log Files
- `trading-platform/dev_server.log` - Development server logs

### Python Cache Files
- All `__pycache__/` directories
- `.coverage` files
- Other Python bytecode files

## Prevention Measures

### 1. Enhanced .gitignore

The `.gitignore` file has been enhanced to prevent future issues:

```gitignore
# Comprehensive patterns for:
- Log files (*.log, npm-debug.log*, etc.)
- Build artifacts (.next/, dist/, build/)
- Dependencies (node_modules/)
- Cache files (__pycache__/, .cache/)
- Coverage reports (.coverage, htmlcov/)
- Large binary files (*.zip, *.tar.gz, etc.)
- Media files (*.mp4, *.mov, etc.)
```

### 2. Pre-commit Hook

A pre-commit hook has been added to prevent large files (>10MB) from being committed.

**Installation:**
```bash
# Run from repository root
.githooks/setup.sh
```

**What it does:**
- Checks all files being committed
- Rejects commits containing files larger than 10MB
- Provides helpful error messages
- Suggests alternatives (Git LFS, .gitignore)

### 3. CI Monitoring

A GitHub Actions workflow monitors repository size:

**Workflow: `.github/workflows/repo-size-check.yml`**
- Runs on pushes to main/develop
- Runs on pull requests
- Scheduled weekly checks
- Threshold: 500MB for .git directory

**Actions taken:**
- Comments on PRs if size threshold is exceeded
- Lists top 20 largest files in history
- Creates automated issues for weekly checks
- Provides cleanup recommendations

## Best Practices

### For Developers

1. **Before Committing:**
   - Review file sizes: `du -h <file>`
   - Check what you're committing: `git status`
   - Verify .gitignore is working: `git check-ignore -v <file>`

2. **For Large Files:**
   - Use Git LFS for binary assets
   - Store large datasets externally
   - Document external storage in README

3. **Regular Maintenance:**
   - Clean up old branches: `git branch -d <branch>`
   - Remove stale remote branches: `git remote prune origin`

### For Maintainers

1. **Monitor Repository Size:**
   - Check CI workflow results weekly
   - Review automated issues
   - Investigate size increases

2. **Clean Up When Needed:**
   ```bash
   # Find large files in history
   git rev-list --objects --all |
     git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
     sed -n 's/^blob //p' |
     sort --numeric-sort --key=2 --reverse |
     head -n 20

   # Clean up with git-filter-repo (install first)
   pip install git-filter-repo
   git filter-repo --path <file-to-remove> --invert-paths
   ```

3. **Update Documentation:**
   - Keep this guide updated
   - Document any cleanup operations
   - Communicate changes to team

## File Size Guidelines

| File Type | Maximum Size | Recommendation |
|-----------|-------------|----------------|
| Source Code | 1MB | Split into smaller modules |
| Configuration | 100KB | Use environment variables |
| Test Fixtures | 1MB | Use factories or mocks |
| Documentation | 500KB | Split into multiple files |
| Images (compressed) | 500KB | Optimize before committing |
| Binary Assets | N/A | Use Git LFS |

## Git LFS Setup (Optional)

For projects that need to track large binary files:

```bash
# Install Git LFS
git lfs install

# Track specific file types
git lfs track "*.psd"
git lfs track "*.mp4"
git lfs track "*.zip"

# Commit .gitattributes
git add .gitattributes
git commit -m "Configure Git LFS"
```

## Troubleshooting

### "Repository too large" error

If you encounter this error:

1. Identify large files:
   ```bash
   git rev-list --objects --all |
     git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
     sort --numeric-sort --key=2 --reverse |
     head -n 20
   ```

2. Remove from history (CAUTION: rewrites history):
   ```bash
   git filter-repo --path <file> --invert-paths
   ```

3. Force push (requires team coordination):
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

### Pre-commit hook not working

```bash
# Reinstall hooks
.githooks/setup.sh

# Verify installation
ls -la .git/hooks/pre-commit

# Test manually
.git/hooks/pre-commit
```

## Related Issues

- [#315](https://github.com/kaenozu/Ult/issues/315) - Repository size optimization (parent issue)
- [#311](https://github.com/kaenozu/Ult/issues/311) - Log file deletion
- [#312](https://github.com/kaenozu/Ult/issues/312) - .next build artifacts deletion
- [#313](https://github.com/kaenozu/Ult/issues/313) - node_modules deletion

## Additional Resources

- [GitHub: Managing large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files)
- [Git LFS Documentation](https://git-lfs.github.com/)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [Pro Git Book: Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Packfiles)
