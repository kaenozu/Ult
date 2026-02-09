# Claude Code Settings Reference

A comprehensive guide to all available configuration options in Claude Code's `settings.json` files.

## Settings Hierarchy (5 tiers, high to low priority):

1. Command line arguments (single-session)
2. `.claude/settings.local.json` (personal, gitignored)
3. `.claude/settings.json` (team-shared, committed)
4. `~/.claude/settings.json` (global personal)
5. `managed-settings.json` (org policy, read-only)

## Core Configuration

```json
{
  "model": "opus",           // "sonnet", "haiku", or full model ID
  "language": "japanese",
  "cleanupPeriodDays": 30,
  "autoUpdatesChannel": "stable",
  "alwaysThinkingEnabled": false
}
```

## Permissions - Security First

```json
{
  "permissions": {
    "allow": [
      "Edit(*)",                    // All file edits
      "Write(*)",                   // All file writes
      "Bash(npm run *)",            // NPM scripts
      "Bash(git *)",                // Git commands
      "WebFetch(domain:*)",         // All web fetches
      "mcp__*"                      // All MCP servers
    ],
    "deny": [
      "Read(.env)",                 // Never read secrets
      "Read(./secrets/**)",
      "Bash(curl *)"               // Restrictive curl
    ],
    "additionalDirectories": [],
    "defaultMode": "acceptEdits",   // Auto-accept edits
    "disableBypassPermissionsMode": "disable"
  }
}
```

**Permission Modes:**
- `"default"` - Prompt for everything
- `"acceptEdits"` - Auto-accept file edits
- `"viewOnly"` - Read-only
- `"bypassPermissions"` - Skip all checks (use carefully)

## Hooks - Automation at Events

13 hook events: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `Notification`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `Setup`.

**Example:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ${CLAUDE_PROJECT_DIR}/.claude/hooks/validate.py",
            "timeout": 5000
          }
        ]
      }
    ]
  },
  "disableAllHooks": false
}
```

**Exit codes:** 0=success, 1=error (continue), 2=block.

## MCP Servers

```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["memory", "github", "filesystem"],
  "disabledMcpjsonServers": ["experimental"]
}
```

## Sandboxing (Security)

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["git", "docker", "gh"],
    "allowUnsandboxedCommands": false,
    "network": {
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

## Plugins

```json
{
  "enabledPlugins": {
    "formatter@acme-tools": true,
    "deployer@acme-tools": true
  },
  "extraKnownMarketplaces": {
    "acme-tools": {
      "source": {
        "source": "github",
        "repo": "acme-corp/claude-plugins"
      }
    }
  }
}
```

## Display & UX

```json
{
  "statusLine": {
    "type": "command",
    "command": "git branch --show-current 2>/dev/null || echo 'no-branch'"
  },
  "spinnerTipsEnabled": true,
  "showTurnDuration": false,
  "respectGitignore": true,
  "terminalProgressBarEnabled": true
}
```

## Model Configuration

```json
{
  "model": "sonnet[1m]",    // 1M token context
  // or for Opus 4.6 effort control: use /model UI
}
```

**Environment Variables:**
```
CLAUDE_CODE_SUBAGENT_MODEL=haiku
MAX_THINKING_TOKENS=10000
```

## Auto-Apply Skills

```json
{
  "autoApplySkills": {
    "dev-master": {
      "enabled": true,
      "agent": "dev-agent"
    }
  }
}
```

## Complete Example for ULT

```json
{
  "model": "sonnet",
  "language": "japanese",
  "permissions": {
    "allow": [
      "Edit(*)",
      "Write(*)",
      "Bash(npm run *)",
      "Bash(npx tsc --noEmit)",
      "Bash(npm test)",
      "Bash(./scripts/quality-gates-check.sh)"
    ],
    "deny": [
      "Read(.env)",
      "Read(*.key)"
    ],
    "defaultMode": "acceptEdits"
  },
  "enableAllProjectMcpServers": true,
  "disableAllHooks": false,
  "sandbox": {
    "enabled": true,
    "excludedCommands": ["git"]
  },
  "statusLine": {
    "type": "command",
    "command": "echo 'ULT Platform'"
  }
}
```

---

**Source**: [Claude Code Settings Reference](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-settings.md)