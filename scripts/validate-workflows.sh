#!/bin/bash

# CI Workflow Validation Script
# This script validates that all GitHub Actions workflow files are properly configured

set -e

echo "🔍 Validating GitHub Actions workflows..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Check if workflow directory exists
if [ ! -d ".github/workflows" ]; then
  echo -e "${RED}❌ .github/workflows directory not found${NC}"
  exit 1
fi

echo "📁 Found workflows directory"
echo ""

# List all workflow files
WORKFLOWS=$(find .github/workflows -type f \( -name "*.yml" -o -name "*.yaml" \))

if [ -z "$WORKFLOWS" ]; then
  echo -e "${RED}❌ No workflow files found${NC}"
  exit 1
fi

echo "📋 Workflow files found:"
for workflow in $WORKFLOWS; do
  echo "   - $workflow"
  ((TOTAL++))
done
echo ""

# Basic YAML syntax check
echo "🔬 Checking YAML syntax..."
for workflow in $WORKFLOWS; do
  if command -v yamllint &> /dev/null; then
    if yamllint -d relaxed "$workflow" &> /dev/null; then
      echo -e "   ${GREEN}✓${NC} $workflow"
      ((PASSED++))
    else
      echo -e "   ${RED}✗${NC} $workflow (YAML syntax error)"
      ((FAILED++))
    fi
  else
    # Fallback to Python if yamllint not available
    if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" &> /dev/null; then
      echo -e "   ${GREEN}✓${NC} $workflow"
      ((PASSED++))
    else
      echo -e "   ${RED}✗${NC} $workflow (YAML syntax error)"
      ((FAILED++))
    fi
  fi
done
echo ""

# Check for required fields
echo "🔬 Checking required fields..."
for workflow in $WORKFLOWS; do
  WORKFLOW_NAME=$(basename "$workflow")
  HAS_NAME=$(grep -c "^name:" "$workflow" || true)
  HAS_ON=$(grep -c "^on:" "$workflow" || true)
  HAS_JOBS=$(grep -c "^jobs:" "$workflow" || true)
  
  if [ "$HAS_NAME" -gt 0 ] && [ "$HAS_ON" -gt 0 ] && [ "$HAS_JOBS" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} $WORKFLOW_NAME (has name, on, jobs)"
  else
    echo -e "   ${YELLOW}⚠${NC} $WORKFLOW_NAME (missing: name=$HAS_NAME, on=$HAS_ON, jobs=$HAS_JOBS)"
  fi
done
echo ""

# Check for reusable workflows
echo "🔬 Checking reusable workflows..."
for workflow in $WORKFLOWS; do
  WORKFLOW_NAME=$(basename "$workflow")
  if grep -q "workflow_call" "$workflow"; then
    echo -e "   ${GREEN}✓${NC} $WORKFLOW_NAME (reusable)"
  else
    if [ "$WORKFLOW_NAME" != "ci.yml" ]; then
      echo -e "   ${YELLOW}ℹ${NC} $WORKFLOW_NAME (not reusable)"
    fi
  fi
done
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Total workflows: $TOTAL"
echo -e "   ${GREEN}Passed: $PASSED${NC}"
if [ "$FAILED" -gt 0 ]; then
  echo -e "   ${RED}Failed: $FAILED${NC}"
else
  echo "   Failed: 0"
fi
echo ""

if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}❌ Validation failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All workflows validated successfully${NC}"
  exit 0
fi
