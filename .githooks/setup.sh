#!/bin/bash
# Setup script to install git hooks

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
GIT_DIR="$(git rev-parse --git-dir)"

echo "Installing git hooks..."

# Create symlink to pre-commit hook
if [ -f "$SCRIPT_DIR/pre-commit" ]; then
    ln -sf "$SCRIPT_DIR/pre-commit" "$GIT_DIR/hooks/pre-commit"
    echo "✓ Installed pre-commit hook"
else
    echo "✗ pre-commit hook not found"
    exit 1
fi

echo ""
echo "Git hooks installed successfully!"
echo "To uninstall, remove: $GIT_DIR/hooks/pre-commit"
