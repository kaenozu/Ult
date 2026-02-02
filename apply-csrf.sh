#!/usr/bin/env bash

# Automated CSRF Protection Application Script
# Scans all API routes and adds CSRF protection to state-changing methods

set -e

ROOT_DIR="trading-platform/app/api"
CSRF_IMPORT="import { requireCSRF } from '@/app/lib/csrf/csrf-protection';"

echo "=========================================="
echo "CSRF Protection Automation Script"
echo "=========================================="
echo ""

# Find all route.ts files
find "$ROOT_DIR" -name "route.ts" -type f | while read route_file; do
  echo "Processing: $route_file"
  
  # Check if file already has CSRF import
  if grep -q "requireCSRF" "$route_file"; then
    echo "  ✓ Already has CSRF protection, skipping..."
    continue
  fi
  
  # Find the main export function (POST, PUT, PATCH)
  # Insert import after existing imports
  LAST_IMPORT_LINE=$(grep -n "^import" "$route_file" | tail -1 | cut -d: -f1)
  
  if [ -n "$LAST_IMPORT_LINE" ]; then
    # Insert CSRF import after last import
    sed -i "${LAST_IMPORT_LINE}a\\
$CSRF_IMPORT" "$route_file"
    echo "  ✓ Added CSRF import at line $((LAST_IMPORT_LINE + 1))"
  else
    echo "  ⚠ No imports found, manual intervention needed"
    continue
  fi
  
  # For each POST/PUT/PATCH function, add CSRF check
  # Simple approach: Find "export async function POST" and add after try {
  # This is a simplified version - production script would use AST parsing
  
  POST_LINE=$(grep -n "export async function POST" "$route_file" | head -1 | cut -d: -f1)
  PUT_LINE=$(grep -n "export async function PUT" "$route_file" | head -1 | cut -d: -f1)
  PATCH_LINE=$(grep -n "export async function PATCH" "$route_file" | head -1 | cut -d: -f1)
  
  for LINE in $POST_LINE $PUT_LINE $PATCH_LINE; do
    if [ -n "$LINE" ]; then
      # Find the try { line after function declaration
      NEXT_LINES=$(tail -n +$LINE "$route_file" | head -20)
      TRY_LINE_OFFSET=$(echo "$NEXT_LINES" | grep -n "try {" | head -1 | cut -d: -f1)
      
      if [ -n "$TRY_LINE_OFFSET" ]; then
        INSERT_AT=$((LINE + TRY_LINE_OFFSET))
        # Insert CSRF check as first statement in try block
        sed -i "${INSERT_AT}a\\
    // CSRF protection\\
    const csrfError = requireCSRF(request);\\
    if (csrfError) return csrfError;\\
\\
" "$route_file"
        echo "  ✓ Added CSRF check at line $insert_at"
      fi
    fi
  done
  
  echo ""
done

echo "=========================================="
echo "CSRF Protection Application Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review changes in all modified route files"
echo "2. Run type checking: npm run typecheck"
echo "3. Run tests: npm test"
echo "4. Manually verify CSRF tokens in browser dev tools"
