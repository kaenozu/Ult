# Git Branch Merge Script - Simplified Version
# Usage: .\scripts\merge-branches-simple.ps1

$ErrorActionPreference = "Stop"

# Log functions
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Log-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Log-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Branches to merge (priority order)
$BranchesToMerge = @(
    "fix/build-and-ts",
    "fix/typescript-errors",
    "fix/mvp-stabilization",
    "fix/system-stabilization-final",
    "fix/tests-final-2",
    "fix/test-env",
    "fix/quality-and-cleanup",
    "refactor/code-quality-improvements",
    "refactor/code-quality-enhancement",
    "refactor/type-safety",
    "refactor/magic-numbers-extraction",
    "refactor/backend-api",
    "refactor-signal-panel-6907079868566096462",
    "refactor/core-services-store-13647055190934339026",
    "refactor/singleton-and-error-handling",
    "refactor/update-skills-and-platform",
    "feature/trading-platform-mvp",
    "feature/ai-prediction-error-display",
    "feature/ai-self-correction",
    "feature/api-performance-monitor",
    "feature/chart-ui-improvements",
    "feature/enhanced-testing",
    "feature/ml-ensemble-prediction",
    "feature/persistent-stock-db",
    "feature/trade-journal-analyzer",
    "feature/trading-intelligence-suite",
    "bolt/optimize-store-selectors-4775789442959145478",
    "bolt/optimize-page-renders-5177960276316492258",
    "bolt/optimize-stock-chart-11764159027938189162",
    "bolt/optimize-stock-table-renders-6811503498995386686",
    "bolt-optimize-stocktable-14367542531936839213",
    "bolt-optimize-usechartdata-map-lookup-17640028551597559804",
    "perf/backtest-optimization-14983486655620126981",
    "perf/memory-leaks-and-test-coverage",
    "perf/optimize-render-selectors-5715367787258029266",
    "sentinel/rate-limit-market-api-9978099823618813567",
    "sentinel-fix-alpha-vantage-security-14024923650376383263",
    "sentinel-fix-market-api-exposure-15270884287123636248",
    "sentinel/fix-market-api-validation-3499725779458618768",
    "security/api-key-protection",
    "palette-bottom-panel-aria-152332587082508800",
    "palette-mobile-sidebar-a11y-3472329217493109631",
    "palette-orderpanel-a11y-7042432316388344292",
    "palette-signal-panel-a11y-13321066371711121796",
    "palette-ux-empty-state-6904396643108971133",
    "palette-ux-improvements-14868249237974140758"
)

# Merge a single branch
function Merge-Branch {
    param([string]$Branch)
    
    $remoteBranch = "origin/$Branch"
    
    Log-Info "Merging branch: $Branch"
    
    # Check if remote branch exists
    $remoteBranchExists = git show-ref --verify --quiet "refs/remotes/$remoteBranch" 2>$null
    if (-not $remoteBranchExists) {
        Log-Warning "Remote branch does not exist: $remoteBranch"
        return $true
    }
    
    # Try to merge
    $mergeSuccess = $true
    try {
        $null = git merge --no-ff --no-commit $remoteBranch 2>&1
    } catch {
        $mergeSuccess = $false
    }
    
    if ($mergeSuccess) {
        # No conflicts
        Log-Success "Merge successful: $Branch"
        
        # Commit the merge
        git commit -m "Merge: $remoteBranch into main"
        Log-Success "Merge completed: $Branch"
        return $true
    } else {
        # Conflicts detected
        Log-Error "Conflicts detected in: $Branch"
        Log-Info "Options:"
        Log-Info "1) Resolve conflicts manually and continue"
        Log-Info "2) Abort merge and skip this branch"
        Log-Info "3) Abort merge and stop"
        
        $choice = Read-Host "Choose (1/2/3)"
        
        switch ($choice) {
            "1" {
                Log-Info "Please resolve conflicts manually..."
                Log-Info "After resolving, run:"
                Write-Host "  git add <resolved files>"
                Write-Host "  git commit"
                Write-Host "  .\scripts\merge-branches-simple.ps1"
                exit 1
            }
            "2" {
                Log-Warning "Skipping this branch..."
                git merge --abort
                return $null
            }
            "3" {
                Log-Warning "Aborting merge..."
                git merge --abort
                exit 1
            }
            default {
                Log-Error "Invalid choice"
                exit 1
            }
        }
    }
}

# Main process
Log-Info "Starting merge process..."

# Check current branch
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Log-Error "Please switch to main branch"
    exit 1
}

# Fetch latest from remote
Log-Info "Fetching latest from remote..."
git fetch origin

# Check if working directory is clean
$status = git status --porcelain
if ($status) {
    Log-Error "Working directory is not clean. Please commit or stash changes."
    exit 1
}

# Track merge results
$mergedBranches = @()
$skippedBranches = @()
$failedBranches = @()

# Merge each branch
foreach ($branch in $BranchesToMerge) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Branch: $branch" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    $result = Merge-Branch $branch
    if ($result -eq $true) {
        $mergedBranches += $branch
    } elseif ($result -eq $false) {
        $failedBranches += $branch
    } else {
        $skippedBranches += $branch
    }
}

# Display results
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Merge Results" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($mergedBranches.Count -gt 0) {
    Log-Success "Merged branches ($($mergedBranches.Count)):"
    foreach ($branch in $mergedBranches) {
        Write-Host "  OK $branch" -ForegroundColor Green
    }
}

if ($skippedBranches.Count -gt 0) {
    Log-Warning "Skipped branches ($($skippedBranches.Count)):"
    foreach ($branch in $skippedBranches) {
        Write-Host "  SKIP $branch" -ForegroundColor Yellow
    }
}

if ($failedBranches.Count -gt 0) {
    Log-Error "Failed branches ($($failedBranches.Count)):"
    foreach ($branch in $failedBranches) {
        Write-Host "  FAIL $branch" -ForegroundColor Red
    }
}

Write-Host ""

if ($mergedBranches.Count -gt 0) {
    Log-Info "Ready to push changes to remote:"
    Write-Host "  git push origin main"
}

Log-Info "Merge process completed"
