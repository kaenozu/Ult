# Repository Size Management

## Overview
This repository includes tools and workflows to manage repository size and prevent it from growing too large.

## Current Status
- ✅ `.gitignore` updated to exclude temporary/build files
- ✅ Temporary files removed from working tree
- ⚠️ Git history cleanup required (run `scripts/cleanup-git-history.sh`)
- ✅ Pre-commit checks available

## Quick Start

### For Repository Maintainers
To clean up the git history and reduce repository size:

```bash
# Run the cleanup script (requires local access, cannot be run in CI)
./scripts/cleanup-git-history.sh
```

⚠️ **Note**: This rewrites git history. See [REPOSITORY_CLEANUP_GUIDE.md](../REPOSITORY_CLEANUP_GUIDE.md) for details.

### For Contributors
To prevent committing large files:

```bash
# Install the pre-commit hook (optional but recommended)
ln -s ../../scripts/pre-commit-size-check.sh .git/hooks/pre-commit
```

## Monitoring

The repository includes a GitHub Actions workflow (`repo-size-check.yml`) that:
- Runs on every push to `main` or `develop`
- Runs on every pull request
- Runs weekly (every Monday)
- Creates issues if `.git` size exceeds 500MB
- Comments on PRs if size threshold is exceeded

## File Size Guidelines

| File Type | Max Size | Recommendation |
|-----------|----------|----------------|
| Source code | 100KB | Split large files into modules |
| Documentation | 100KB | Split into multiple files |
| Images | 200KB | Use optimized formats, consider external hosting |
| Binary files | N/A | Use Git LFS |
| Build outputs | 0 | Never commit (add to .gitignore) |
| Temporary files | 0 | Never commit (add to .gitignore) |

## What NOT to Commit

The following files should **never** be committed:

### Build/Output Files
- `*.log` - Log files
- `*-output.txt` - Build/test output
- `tsc-*.txt` - TypeScript compiler output
- `lint-*.txt` - Linter output
- `build-*.txt` - Build logs

### Temporary/Backup Files
- `*.bak`, `*.bak2` - Backup files
- `*.tmp`, `*.temp` - Temporary files
- `*~` - Editor backup files

### Verification Files
- `verification/` - Screenshots and test artifacts
- `screenshots/` - Should be in issues/PRs instead

### Dependencies
- `node_modules/` - Install via `npm install`
- `.next/` - Built by Next.js

## Using Git LFS

For large binary files that must be versioned (e.g., large datasets, media files):

```bash
# Install Git LFS
git lfs install

# Track file types
git lfs track "*.psd"
git lfs track "*.mp4"
git lfs track "data/*.csv"

# Commit .gitattributes
git add .gitattributes
git commit -m "chore: configure Git LFS"
```

## Scripts

### cleanup-git-history.sh
Removes specified files from git history to reduce repository size.

**Usage:**
```bash
./scripts/cleanup-git-history.sh
```

**What it does:**
1. Creates a backup of the repository
2. Removes temporary/build files from history
3. Runs garbage collection
4. Reports space saved

### pre-commit-size-check.sh
Pre-commit hook to prevent large/temporary files from being committed.

**Installation:**
```bash
ln -s ../../scripts/pre-commit-size-check.sh .git/hooks/pre-commit
```

**What it checks:**
- File sizes (warns if > 500KB)
- Temporary file patterns
- Build output files
- Verification screenshots

## Troubleshooting

### "Repository size exceeds 500MB" warning

1. Run the cleanup script: `./scripts/cleanup-git-history.sh`
2. Review large files: `git rev-list --objects --all | git cat-file --batch-check | sort -k3 -n -r | head -20`
3. Check .gitignore is up to date
4. Consider using Git LFS for large files

### "Cannot push, repository too large"

GitHub has a hard limit of 100MB per file. If you hit this:

1. Identify the large file: `git rev-list --objects --all | git cat-file --batch-check | awk '$3 > 100000000 {print}'`
2. Remove it from history: Add to `scripts/cleanup-git-history.sh` and run
3. Use Git LFS if the file is necessary

### Fresh clone required after cleanup

After running `cleanup-git-history.sh`, all team members need to re-clone:

```bash
cd /path/to/projects
rm -rf Ult
git clone https://github.com/kaenozu/Ult.git
cd Ult
npm install  # If working with trading-platform
```

## Best Practices

1. **Review before commit**: Always check what you're committing with `git status` and `git diff --cached`
2. **Use .gitignore**: Keep it updated with patterns for files that shouldn't be committed
3. **Small commits**: Commit often with small, focused changes
4. **No generated files**: Build artifacts, logs, and generated files don't belong in git
5. **External storage**: Use external services for large media files (screenshots in issues, documentation images in CDN)
6. **Regular cleanup**: Run `git gc` periodically to optimize the repository

## References

- [REPOSITORY_CLEANUP_GUIDE.md](../REPOSITORY_CLEANUP_GUIDE.md) - Detailed cleanup instructions
- [.gitignore](../.gitignore) - Current gitignore rules
- [repo-size-check.yml](../.github/workflows/repo-size-check.yml) - Size monitoring workflow

## Support

If you encounter issues with repository size:
1. Check existing issues with label `repository-size`
2. Review the cleanup guide
3. Contact repository maintainers
