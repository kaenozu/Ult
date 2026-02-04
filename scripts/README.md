# Scripts Directory

This directory contains utility scripts for repository maintenance and operations.

## Available Scripts

### Repository Maintenance

#### `cleanup-git-history.sh` ⚡ NEW
**Purpose**: Remove large temporary files from Git history to reduce repository size.

**Usage**:
```bash
./scripts/cleanup-git-history.sh
```

**⚠️ WARNING**: This script rewrites Git history! See `/docs/GIT_CLEANUP_GUIDE.md` for full instructions.

**What it does**:
- Removes build/lint output files from entire Git history
- Uses `git-filter-repo` for safe history rewriting
- Reduces repository size significantly
- Includes confirmations and safety checks

**Prerequisites**:
```bash
pip3 install git-filter-repo
```

**Documentation**: 
- Full guide: `/docs/GIT_CLEANUP_GUIDE.md`
- Quick reference: `/docs/REPOSITORY_SIZE_QUICK_REF.md`

---

#### `quality-gates-check.sh`
**Purpose**: Pre-commit quality checks for the repository.

**Usage**:
```bash
./scripts/quality-gates-check.sh
```

**Checks**:
- Test coverage ≥ 80%
- TypeScript: 0 errors
- ESLint: 0 errors  
- Security: No high/critical vulnerabilities
- Build: Production build succeeds

---

#### `validate-workflows.sh`
**Purpose**: Validate GitHub Actions workflow files.

**Usage**:
```bash
./scripts/validate-workflows.sh
```

---

### Database

#### `db-migrate.js`
**Purpose**: Database migration utility.

**Usage**:
```bash
node scripts/db-migrate.js
```

---

### Testing

#### `monkey-test.js`
**Purpose**: Automated chaos/stress testing.

**Usage**:
```bash
node scripts/monkey-test.js
```

#### `check-monkey-test-results.js`
**Purpose**: Analyze monkey test results.

**Usage**:
```bash
node scripts/check-monkey-test-results.js
```

#### `check-ml-integration.js`
**Purpose**: Verify ML model integration.

**Usage**:
```bash
node scripts/check-ml-integration.js
```

---

### WebSocket

#### `websocket-server.js` / `websocket-server.ts`
**Purpose**: WebSocket server for real-time market data.

**Usage**:
```bash
node scripts/websocket-server.js
# or
ts-node scripts/websocket-server.ts
```

---

### Branch Management

#### `merge-all-branches.sh` / `merge-all-branches.ps1`
**Purpose**: Automated branch merging (Bash/PowerShell versions).

**Usage**:
```bash
# Linux/Mac
./scripts/merge-all-branches.sh

# Windows PowerShell
./scripts/merge-all-branches.ps1
```

#### `merge-branches-simple.ps1`
**Purpose**: Simplified branch merging for PowerShell.

**Usage**:
```powershell
./scripts/merge-branches-simple.ps1
```

---

## Adding New Scripts

When adding new scripts to this directory:

1. **Make it executable** (Unix/Linux):
   ```bash
   chmod +x scripts/your-script.sh
   ```

2. **Add shebang line**:
   ```bash
   #!/bin/bash
   # or
   #!/usr/bin/env node
   ```

3. **Include usage documentation**:
   ```bash
   # Usage: ./scripts/your-script.sh [options]
   # Options:
   #   -h, --help    Show help
   #   -v, --verbose Verbose output
   ```

4. **Update this README** with script description

5. **Error handling**:
   ```bash
   set -e  # Exit on error (Bash)
   ```

6. **Test before committing**:
   ```bash
   ./scripts/your-script.sh
   ```

## Script Standards

- ✅ Use descriptive names
- ✅ Include error handling
- ✅ Add usage instructions
- ✅ Use `set -e` in shell scripts
- ✅ Return appropriate exit codes
- ✅ Document prerequisites
- ✅ Include safety confirmations for destructive operations

## Directory Structure

```
scripts/
├── README.md                      # This file
├── cleanup-git-history.sh         # Git history cleanup
├── quality-gates-check.sh         # Quality checks
├── validate-workflows.sh          # Workflow validation
├── db-migrate.js                  # Database migrations
├── websocket-server.js|ts         # WebSocket server
├── monkey-test.js                 # Chaos testing
├── check-monkey-test-results.js   # Test analysis
├── check-ml-integration.js        # ML verification
├── merge-all-branches.sh|ps1      # Branch merging
└── merge-branches-simple.ps1      # Simple merge
```

## Related Documentation

- Main README: `/README.md`
- Git Cleanup Guide: `/docs/GIT_CLEANUP_GUIDE.md`
- Repository Size Quick Ref: `/docs/REPOSITORY_SIZE_QUICK_REF.md`
- Contributing Guide: `/CONTRIBUTING.md`

---

**Last Updated**: 2026-02-04  
**Maintainer**: Repository Team
