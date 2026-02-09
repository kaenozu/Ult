# CLAUDE.md Loading in Monorepos

Understanding how CLAUDE.md files are loaded in large repositories with multiple packages.

## Loading Mechanisms

Claude Code uses **two distinct mechanisms**:

### 1. Ancestor Loading (UP)

When you start Claude Code, it walks **upward** from your current working directory and loads every `CLAUDE.md` it finds. These are loaded **immediately at startup**.

### 2. Descendant Loading (DOWN)

`CLAUDE.md` files in subdirectories are **NOT loaded at launch**. They are loaded **lazily** when you read/edit files in those subdirectories.

## Monorepo Example

```
/mymonorepo/
├── CLAUDE.md              # Root instructions (shared)
├── frontend/
│   └── CLAUDE.md          # Frontend-specific
├── backend/
│   └── CLAUDE.md          # Backend-specific
└── api/
    └── CLAUDE.md          # API-specific
```

### Scenario 1: Start from Root

```bash
cd /mymonorepo
claude
```

| File | Loaded at Launch? |
|------|-------------------|
| `/mymonorepo/CLAUDE.md` | ✅ Yes |
| `/mymonorepo/frontend/CLAUDE.md` | ❌ No (lazy) |
| `/mymonorepo/backend/CLAUDE.md` | ❌ No (lazy) |

### Scenario 2: Start from Subdirectory

```bash
cd /mymonorepo/frontend
claude
```

| File | Loaded at Launch? |
|------|-------------------|
| `/mymonorepo/CLAUDE.md` | ✅ Yes (ancestor) |
| `/mymonorepo/frontend/CLAUDE.md` | ✅ Yes (current) |
| `/mymonorepo/backend/CLAUDE.md` | ❌ No (sibling) |

## Key Principles

1. **Ancestors** → Always loaded at startup
2. **Descendants** → Lazy-loaded on demand
3. **Siblings** → Never loaded (unless you cd into them)
4. **Global**: `~/.claude/CLAUDE.md` → Loaded for ALL projects

## Best Practices for Monorepos

### Root CLAUDE.md
- Repository-wide conventions
- Commit message format
- PR templates
- Common testing strategies

### Component CLAUDE.md
- Framework-specific patterns
- Architecture guidelines
- Component-specific tools
- Testing conventions

### CLAUDE.local.md
- Personal preferences
- Not committed to git

## Why This Design?

- **Shared context propagates**: Root instructions flow down
- **Component isolation**: Frontend dev doesn't see backend noise
- **Context optimization**: Hundreds of KB don't load unnecessarily
- **Scalability**: Works for 100+ package monorepos

## Tips for ULT (Single Package)

Since ULT is a **single Next.js package** (not a monorepo), keep:
- Single `CLAUDE.md` at project root (`C:\gemini-desktop\Ult\`)
- Keep under **150 lines**
- Use **links** to detailed docs in `docs/`
- Reference external reports for patterns

---

**Source**: [Claude-md-for-larger-mono-repos](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-md-for-larger-mono-repos.md)