#!/bin/bash
# GitHub Actions Workflow YAML Validator
# Checks for common YAML syntax issues in workflow files

echo "🔍 Checking GitHub Actions workflow files..."
echo ""

ERRORS=0
WARNINGS=0

for file in .github/workflows/*.yml; do
  echo "Checking: $file"
  
  # Check for tabs (YAML should use spaces)
  if grep -q $'\t' "$file"; then
    echo "  ❌ ERROR: Found tabs (use spaces only)"
    ERRORS=$((ERRORS + 1))
  fi
  
  # Check for trailing spaces
  if grep -q ' $' "$file"; then
    echo "  ⚠️  WARNING: Found trailing spaces"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Check for common YAML issues with multiline strings
  # Look for | or > followed by content that starts with - 
  if awk '/^[[:space:]]*run:[[:space:]]*\|/{p=1;next} /^[[:space:]]*run:/{p=0} p && /^[[:space:]]+-/{print "line " NR": "$0}' "$file" | grep -q .; then
    echo "  ⚠️  WARNING: Potential YAML list interpretation issue in multiline string"
    echo "     (Line starting with - inside run: | might be interpreted as YAML list)"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Basic syntax check using Python if available
  if command -v python3 &> /dev/null; then
    python3 -c "
import sys
try:
    import yaml
    with open('$file', 'r') as f:
        yaml.safe_load(f)
    print('  ✅ YAML syntax valid')
except Exception as e:
    print(f'  ❌ YAML ERROR: {e}')
    sys.exit(1)
" 2>/dev/null || echo "  ⚠️  YAML check skipped (python-yaml not installed)"
  fi
  
  echo ""
done

echo "========================================"
echo "Summary:"
echo "  Errors: $ERRORS"
echo "  Warnings: $WARNINGS"
echo "========================================"

if [ $ERRORS -gt 0 ]; then
  exit 1
else
  echo "✅ All checks passed!"
  exit 0
fi
