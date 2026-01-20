---
name: GitHub Operations
description: Manage GitHub Pull Requests, Issues, and Repository status using the `gh` CLI. Standardizes PR creation with Conventional Commits and detailed body templates.
---

# GitHub Operations Skill

## Purpose
To create high-quality, standardized Pull Requests that are easy to review and merge.

## PR Title Format
Follow **Conventional Commits**:
`<type>(<scope>): <summary>`

- **Types:**
  - `feat`: New feature
  - `fix`: Bug fix
  - `perf`: Performance improvement
  - `docs`: Documentation only
  - `refactor`: Code change that neither fixes a bug nor adds a feature
  - `test`: Adding missing tests or correcting existing tests
  - `chore`: Changes that don't modify src or test files
- **Scope:** (Optional) The module or component (e.g., `frontend`, `backend`, `auth`).
- **Summary:** Imperative present tense. No period at the end.
- **Breaking Changes:** Add `!` before colon (e.g., `feat(api)!: remove v1 endpoints`).

## PR Creation Workflow

### 1. Check Status
```bash
git status
git diff --stat
```

### 2. Push Branch
```bash
git push -u origin HEAD
```

### 3. Create PR (Interactive)
If you want to use the interactive mode:
```bash
gh pr create
```

### 4. Create PR (Command Line Template)
Use this command to create a PR with a structured body:

```bash
gh pr create --title "<type>(<scope>): <summary>" --body "$(cat <<'EOF'
## Summary
<Describe what the PR does and how to test. Visuals are recommended.>

## Implementation Details
- [ ] Detail 1
- [ ] Detail 2

## Risk Assessment
- [ ] Impact on existing features: <None/Low/High>
- [ ] Migration required: <Yes/No>

## Verification
- [ ] Verified manually
- [ ] Unit tests passed
EOF
)"
```

## Useful Commands
- `gh pr list`: List open PRs
- `gh pr view`: View current PR details
- `gh pr browser`: Open PR in browser
