#!/bin/bash

# Quality Gates Pre-flight Check Script
# Run this before creating a PR to ensure all quality gates will pass

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../trading-platform"

cd "$PROJECT_DIR"

echo "========================================="
echo "🚀 Quality Gates Pre-flight Check"
echo "========================================="
echo ""

FAILED_CHECKS=()

# 1. Test Coverage
echo "📊 1/5 Checking test coverage (≥80%)..."
if npm run test:coverage > /tmp/quality-gates-test.log 2>&1; then
  echo "   ✅ Test coverage passed"
else
  echo "   ❌ Test coverage failed (see /tmp/quality-gates-test.log)"
  FAILED_CHECKS+=("Test Coverage")
fi
echo ""

# 2. TypeScript Type Check
echo "🔍 2/5 Checking TypeScript types..."
if npx tsc --noEmit > /tmp/quality-gates-tsc.log 2>&1; then
  echo "   ✅ TypeScript check passed (0 errors)"
else
  ERROR_COUNT=$(grep -c "error TS" /tmp/quality-gates-tsc.log || echo "0")
  echo "   ❌ TypeScript check failed ($ERROR_COUNT errors)"
  echo "   See: /tmp/quality-gates-tsc.log"
  FAILED_CHECKS+=("TypeScript")
fi
echo ""

# 3. ESLint
echo "🎨 3/5 Checking ESLint..."
if npm run lint > /tmp/quality-gates-lint.log 2>&1; then
  echo "   ✅ ESLint passed (0 errors)"
else
  echo "   ❌ ESLint failed"
  echo "   Run 'npm run lint:fix' to auto-fix some issues"
  echo "   See: /tmp/quality-gates-lint.log"
  FAILED_CHECKS+=("ESLint")
fi
echo ""

# 4. Security Audit
echo "🔒 4/5 Checking security vulnerabilities..."
if npm audit --audit-level=high > /tmp/quality-gates-audit.log 2>&1; then
  echo "   ✅ Security audit passed (0 high+ vulnerabilities)"
else
  echo "   ❌ Security audit failed"
  echo "   Run 'npm audit fix' to attempt auto-fix"
  echo "   See: /tmp/quality-gates-audit.log"
  FAILED_CHECKS+=("Security")
fi
echo ""

# 5. Build
echo "🏗️  5/5 Checking build..."
if npm run build > /tmp/quality-gates-build.log 2>&1; then
  # Calculate bundle size
  BUNDLE_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "N/A")
  echo "   ✅ Build passed (size: $BUNDLE_SIZE)"
else
  echo "   ❌ Build failed"
  echo "   See: /tmp/quality-gates-build.log"
  FAILED_CHECKS+=("Build")
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
