---
name: GitHub Operations
description: Manage GitHub Pull Requests, Issues, and Repository status using the `gh` CLI.
---

# GitHub Operations (gh CLI)

Use this skill to interact with the GitHub repository directly from the terminal.
**Prerequisite**: The `gh` CLI tool must be authenticated (usually pre-configured).

## Common Tasks

### 1. Check Status
Get a quick overview of the current PRs and Issues relevant to you.
```powershell
gh status
```

### 2. Create a Pull Request (PR)
When you have finished a task and want to merge changes.
**Important**: Ensure you are on a feature branch, not `main`.

1.  **Push changes**:
    ```powershell
    git push origin HEAD
    ```
2.  **Create PR**:
    ```powershell
    gh pr create --title "Title of your PR" --body "Description of changes"
    ```
    *Interactive mode (simpler)*: `gh pr create --web` (opens browser) or just `gh pr create` (prompts in terminal). For automation, use flags.

### 3. List & View Issues
Find what needs to be done.
- **List all open issues**:
    ```powershell
    gh issue list
    ```
- **View specific issue**:
    ```powershell
    gh issue view <issue-number>
    ```

### 4. Check PR Status/Checks
See if CI/CD passed for a PR.
```powershell
gh pr checks <pr-number>
```

### 5. Checkout a PR
To review or modify someone else's PR locally.
```powershell
gh pr checkout <pr-number>
```

## Best Practices
- **Atomic PRs**: Keep PRs focused on a single task or fix.
- **Descriptive Titles**: Use titles that explain *what* changed (e.g., "feat: Add Auto-Pilot UI", "fix: Resolve build error in api.ts").
- **Link Issues**: In the body, use "Fixes #123" to auto-close issues.
