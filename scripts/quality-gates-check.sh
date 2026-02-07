#!/bin/bash

# Quality Gates Pre-flight Check Script
# Run this before creating a PR to ensure all quality gates will pass

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../trading-platform"

# Validate that trading-platform directory exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ Error: trading-platform directory not found at $PROJECT_DIR"
  echo "Please run this script from the repository root or scripts directory."
  exit 1
fi

cd "$PROJECT_DIR"

echo "========================================="
echo "🚀 Quality Gates Pre-flight Check"
echo "========================================="
echo ""

FAILED_CHECKS=()

# 1. TypeScript & Lint (via Build)
echo "🏗️  1/3 Running Build (includes Type Check & Lint)..."
if npm run build > /tmp/quality-gates-build.log 2>&1; then
  # Calculate bundle size
  BUNDLE_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "N/A")
  echo "   ✅ Build, Type Check, and Lint passed (size: $BUNDLE_SIZE)"
else
  echo "   ❌ Build failed (Check types or lint)"
  echo "   See: /tmp/quality-gates-build.log"
  FAILED_CHECKS+=("Build/Lint/TypeCheck")
fi
echo ""

# 2. Test Coverage
echo "📊 2/3 Checking test coverage (≥80%)..."
if npm run test:coverage > /tmp/quality-gates-test.log 2>&1; then
  echo "   ✅ Test coverage passed"
else
  echo "   ❌ Test coverage failed (see /tmp/quality-gates-test.log)"
  FAILED_CHECKS+=("Test Coverage")
fi
echo ""

# 3. Security Audit
echo "🔒 3/3 Checking security vulnerabilities..."
if npm audit --audit-level=high > /tmp/quality-gates-audit.log 2>&1; then
  echo "   ✅ Security audit passed (0 high+ vulnerabilities)"
else
  echo "   ❌ Security audit failed"
  echo "   Run 'npm audit fix' to attempt auto-fix"
  echo "   See: /tmp/quality-gates-audit.log"
  FAILED_CHECKS+=("Security")
fi
echo ""

# Summary
echo "========================================="
if [ ${#FAILED_CHECKS[@]} -eq 0 ]; then
  echo "✅ All quality gates passed!"
  echo "You can safely create a PR."
  echo "========================================="
  exit 0
else
  echo "❌ ${#FAILED_CHECKS[@]} quality gate(s) failed:"
  for check in "${FAILED_CHECKS[@]}"; do
    echo "   - $check"
  done
  echo ""
  echo "Please fix the issues before creating a PR."
  echo "Logs are available in /tmp/quality-gates-*.log"
  echo "========================================="
  exit 1
fi
