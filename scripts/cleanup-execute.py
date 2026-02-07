#!/usr/bin/env python3
"""
Simple script to remove .next directory from git history
Uses git-filter-branch which is available in Git Bash
"""

import subprocess
import sys


def run_command(cmd, timeout=600):
    """Run a shell command"""
    print(f">>> {cmd}")
    try:
        result = subprocess.run(
            cmd, shell=True, timeout=timeout, capture_output=True, text=True
        )
        if result.stdout:
            print(result.stdout[:500])  # Limit output
        if result.stderr:
            print(result.stderr[:500], file=sys.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    print("=== Repository Cleanup Script ===")
    print("Removing .next/ directory from git history...")
    print()

    # Check current size
    print("Step 1: Checking current size...")
    run_command("du -sh .git")

    # Remove .next from history using filter-branch
    print("\nStep 2: Removing .next/ from git history...")
    cmd = """git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch .next' --prune-empty --tag-name-filter cat -- --all 2>&1 | tail -50"""

    if not run_command(cmd, timeout=1800):  # 30 min timeout
        print("filter-branch failed or incomplete")
        return 1

    print("\nStep 3: Cleaning up...")
    run_command("git reflog expire --expire=now --all")
    run_command("git gc --prune=now --aggressive")

    print("\nStep 4: Checking result...")
    run_command("du -sh .git")
    run_command("git count-objects -vH")

    print("\n=== Cleanup Complete ===")
    print("Run 'git push origin --force --all' to apply changes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
