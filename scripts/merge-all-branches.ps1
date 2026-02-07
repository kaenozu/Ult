# Gitリポジトリのすべてのブランチを安全にマージするPowerShellスクリプト
# 使用方法: .\scripts\merge-all-branches.ps1 [-SkipTests]

# パラメータ定義
param(
    [switch]$SkipTests = $false
)

# エラーが発生したらスクリプトを停止
$ErrorActionPreference = "Stop"

# ログ関数
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

# マージすべきブランチの優先順位リスト
# カテゴリ別にグループ化

$HighPriorityBranches = @(
    "fix/ci-lint-errors",
    "fix/build-and-lint-errors",
    "fix/build-and-ts",
    "fix/typescript-errors",
    "fix/mvp-stabilization",
    "fix/system-stabilization-final",
    "fix/tests-final-2",
    "fix/test-env",
    "fix/quality-and-cleanup"
)

$MediumPriorityBranches = @(
    "refactor/code-quality-improvements",
    "refactor/code-quality-enhancement",
    "refactor/type-safety",
    "refactor/magic-numbers-extraction",
    "refactor/magic-numbers-extraction-pr",
    "refactor/backend-api",
    "refactor-signal-panel-6907079868566096462",
    "refactor/core-services-store-13647055190934339026",
    "refactor/singleton-and-error-handling",
    "refactor/update-skills-and-platform"
)

$FeatureBranches = @(
    "feature/trading-platform-mvp",
    "feature/ai-prediction-error-display",
    "feature/ai-self-correction",
    "feature/api-performance-monitor",
    "feature/chart-ui-improvements",
    "feature/code-quality-and-readme",
    "feature/config-management-refactor",
    "feature/enhanced-testing",
    "feature/ml-ensemble-prediction",
    "feature/persistent-stock-db",
    "feature/trade-journal-analyzer",
    "feature/trading-intelligence-suite"
)

$PerformanceBranches = @(
    "bolt/optimize-store-selectors-4775789442959145478",
    "bolt/optimize-page-renders-5177960276316492258",
    "bolt/optimize-stock-chart-11764159027938189162",
    "bolt/optimize-stock-table-renders-6811503498995386686",
    "bolt-optimize-stocktable-14367542531936839213",
    "bolt-optimize-usechartdata-map-lookup-17640028551597559804",
    "perf/backtest-optimization-14983486655620126981",
    "perf/memory-leaks-and-test-coverage",
    "perf/optimize-render-selectors-5715367787258029266"
)

$SecurityBranches = @(
    "sentinel/rate-limit-market-api-9978099823618813567",
    "sentinel-fix-alpha-vantage-security-14024923650376383263",
    "sentinel-fix-market-api-exposure-15270884287123636248",
    "sentinel/fix-market-api-validation-3499725779458618768",
    "security/api-key-protection"
)

$AccessibilityBranches = @(
    "palette-bottom-panel-aria-152332587082508800",
    "palette-mobile-sidebar-a11y-3472329217493109631",
    "palette-orderpanel-a11y-7042432316388344292",
    "palette-signal-panel-a11y-13321066371711121796",
    "palette-ux-empty-state-6904396643108971133",
    "palette-ux-improvements-14868249237974140758"
)

# すべてのブランチを結合
$AllBranches = $HighPriorityBranches + $MediumPriorityBranches + $FeatureBranches + $PerformanceBranches + $SecurityBranches + $AccessibilityBranches

# コンフリクトが発生した場合の処理
function Handle-Conflict {
    param([string]$Branch)
    
    Log-Error "コンフリクトが発生しました: $Branch"
    
    Write-Host ""
    Write-Host "以下のオプションから選択してください:"
    Write-Host "1) コンフリクトを手動で解決して続行"
    Write-Host "2) マージを中止して元の状態に戻す"
    Write-Host "3) 現在のブランチをスキップして次へ進む"
    Write-Host ""
    
    $choice = Read-Host "選択 (1/2/3)"
    
    switch ($choice) {
        "1" {
            Log-Info "コンフリクトを手動で解決してください..."
            Log-Info "解決後、以下のコマンドを実行して続行してください:"
            Write-Host "  git add <解決したファイル>"
            Write-Host "  git commit"
            Write-Host "  .\scripts\merge-all-branches.ps1 -Continue"
            exit 1
        }
        "2" {
            Log-Warning "マージを中止します..."
            git merge --abort
            exit 1
        }
        "3" {
            Log-Warning "現在のブランチをスキップします..."
            git merge --abort
            return $false
        }
        default {
            Log-Error "無効な選択です"
            exit 1
        }
    }
}

# ブランチをマージする関数
function Merge-Branch {
    param([string]$Branch)
    
    $remoteBranch = "origin/$Branch"
    
    Log-Info "ブランチをマージ中: $Branch"
    
    # リモートブランチが存在するか確認
    $remoteBranchExists = git show-ref --verify --quiet "refs/remotes/$remoteBranch" 2>$null
    if (-not $remoteBranchExists) {
        Log-Warning "リモートブランチが存在しません: $remoteBranch"
        return $true
    }
    
    # マージを試みる
    $mergeSuccess = $true
    try {
        $null = git merge --no-ff --no-commit $remoteBranch 2>&1
    } catch {
        $mergeSuccess = $false
    }
    
    if ($mergeSuccess) {
        # コンフリクトがない場合
        Log-Success "マージ成功: $Branch"
        
        # ビルドとテストを実行（オプション）
        if (-not $SkipTests) {
            Log-Info "ビルドとテストを実行中..."
            $buildResult = npm run build 2>&1
            if ($LASTEXITCODE -eq 0) {
                $testResult = npm test 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Log-Success "ビルドとテスト成功"
                } else {
                    Log-Error "テストが失敗しました"
                    git merge --abort
                    return $false
                }
            } else {
                Log-Error "ビルドが失敗しました"
                git merge --abort
                return $false
            }
        }
        
        # マージをコミット
        git commit -m "マージ: $remoteBranch をmainにマージ"
        Log-Success "マージ完了: $Branch"
        return $true
    } else {
        # コンフリクトがある場合
        return Handle-Conflict $Branch
    }
}

# メイン処理
function Main {
    param([switch]$Continue)
    
    Log-Info "マージプロセスを開始します..."
    
    # 現在のブランチを確認
    $currentBranch = git branch --show-current
    if ($currentBranch -ne "main") {
        Log-Error "mainブランチに切り替えてください"
        exit 1
    }
    
    # リモートの最新情報を取得
    Log-Info "リモートの最新情報を取得中..."
    git fetch origin
    
    # 作業ディレクトリがクリーンか確認
    $status = git status --porcelain
    if ($status) {
        Log-Error "作業ディレクトリがクリーンではありません。変更をコミットまたはスタッシュしてください。"
        exit 1
    }
    
    # マージ済みブランチのリスト
    $mergedBranches = @()
    $skippedBranches = @()
    $failedBranches = @()
    
    # 各ブランチをマージ
    foreach ($branch in $AllBranches) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "ブランチ: $branch" -ForegroundColor Cyan
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
    
    # 結果を表示
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "マージ結果" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($mergedBranches.Count -gt 0) {
        Log-Success "マージ成功したブランチ ($($mergedBranches.Count)):"
        foreach ($branch in $mergedBranches) {
            Write-Host "  ✓ $branch" -ForegroundColor Green
        }
    }
    
    if ($skippedBranches.Count -gt 0) {
        Log-Warning "スキップしたブランチ ($($skippedBranches.Count)):"
        foreach ($branch in $skippedBranches) {
            Write-Host "  ⊘ $branch" -ForegroundColor Yellow
        }
    }
    
    if ($failedBranches.Count -gt 0) {
        Log-Error "マージ失敗したブランチ ($($failedBranches.Count)):"
        foreach ($branch in $failedBranches) {
            Write-Host "  ✗ $branch" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    if ($mergedBranches.Count -gt 0) {
        Log-Info "変更をリモートにプッシュする準備ができました:"
        Write-Host "  git push origin main"
    }
}

# スクリプトの実行
Main -Continue:$Continue
