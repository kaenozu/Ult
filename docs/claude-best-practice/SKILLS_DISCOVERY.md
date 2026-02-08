# Skills Discovery in Monorepos

How Claude Code discovers and loads skills in large multi-package repositories.

## Discovery Mechanisms

### Static Discovery (Default)

Claude scans **.claude/skills/** directories **recursively**:
- Each subdirectory is a skill
- Requires `SKILL.md` file
- Works in monorepos: each package can have its own `.claude/skills/`

### Dynamic Discovery (for Large Monorepos)

For repos with **100+ packages**, configure:
```json
{
  "skillsDiscovery": {
    "enabled": true,
    "searchDepth": 3,           // Max directory depth to search
    "includePatterns": ["**/skills/**"],
    "excludePatterns": ["**/node_modules/**", "**/.git/**"],
    "maxSkills": 50             // Limit skill loading
  }
}
```

## Skill Structure

```
.claude/
├── skills/
│   ├── dev-master/
│   │   └── SKILL.md
│   ├── code-reviewer/
│   │   └── SKILL.md
│   └── debugger-pro/
│       └── SKILL.md
```

Each skill directory contains:
- `SKILL.md` (required) - YAML frontmatter + markdown instructions
- Optional: `prompts/`, `templates/`, `examples/`

## YAML Frontmatter (SKILL.md)

```yaml
---
name: skill-name
description: When to invoke (used for auto-discovery)
model: auto  # "haiku", "sonnet", "opus", or "auto"
context: fork  # "shared" (default) or "fork" (isolated)
disable-model-invocation: false  # true prevents auto-invoke
allowed-tools: [Bash, Read, Edit]  # Restrict tools
---
```

**Context modes:**
- `"shared"` - Same Claude context (default, faster)
- `"fork"` - Isolated subagent (safer, for destructive ops)

## Auto-Invocation

Skills can be auto-applied based on user intent:

```json
{
  "autoApplySkills": {
    "dev-master": {
      "enabled": true,
      "triggerPatterns": [
        "fix", "implement", "refactor", "write code"
      ]
    }
  }
}
```

## Performance Tips for Large Monorepos

1. **Limit skill count**: Max 20-50 skills per session
2. **Use `context: fork`** only when needed (overhead ~30%)
3. **Exclude patterns**: Skip `node_modules`, `.git`, `dist`
4. **Search depth**: `3` is sufficient (avoid recursive explosion)
5. **Skill partitioning**: Separate skills by domain (frontend/backend/ml)

## ULT Implementation

Since ULT is **single-package**, simple structure works:

```
.claude/skills/
├── dev-master/          # All dev tasks (auto-applied)
├── code-reviewer/       # Code reviews
└── debugger-pro/        # Debugging
```

No need for complex `skillsDiscovery` config.

---

**Source**: [Claude-skills-for-larger-mono-repos](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-skills-for-larger-mono-repos.md)