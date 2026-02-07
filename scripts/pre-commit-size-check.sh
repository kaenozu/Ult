#!/bin/bash
# Pre-commit hook to prevent large files and temporary files from being committed

# Maximum file size in bytes (500KB)
MAX_SIZE=512000

echo "Checking for large files and temporary files..."

# Get list of files to be committed
files=$(git diff --cached --name-only --diff-filter=ACM)

errors=0

for file in $files; do
    # Skip if file doesn't exist (might be deleted)
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Get file size
    size=$(wc -c < "$file")
    
    # Check if file is too large
    if [ $size -gt $MAX_SIZE ]; then
        size_mb=$(echo "scale=2; $size / 1048576" | bc)
        echo "❌ ERROR: $file is too large (${size_mb}MB > 0.5MB)"
        echo "   Consider using Git LFS for large files"
        errors=$((errors + 1))
    fi
    
    # Check for temporary/build files
    case "$file" in
        *.bak|*.bak2|*.backup)
            echo "❌ ERROR: Backup file should not be committed: $file"
            errors=$((errors + 1))
            ;;
        *-output.txt|*-errors.txt|tsc-*.txt)
            echo "❌ ERROR: Build output file should not be committed: $file"
            errors=$((errors + 1))
            ;;
        *.log)
            echo "❌ ERROR: Log file should not be committed: $file"
            errors=$((errors + 1))
            ;;
        verification/*.png|verification/*.jpg)
            echo "❌ ERROR: Verification screenshot should not be committed: $file"
            echo "   Consider storing screenshots in issues or documentation"
            errors=$((errors + 1))
            ;;
    esac
done

if [ $errors -gt 0 ]; then
    echo ""
    echo "❌ Commit rejected due to $errors error(s)"
    echo "Please fix the issues above and try again"
    echo ""
    echo "If you need to commit large files, use Git LFS:"
    echo "  git lfs track '*.png'"
    echo "  git add .gitattributes"
    exit 1
fi

echo "✅ All checks passed"
exit 0
