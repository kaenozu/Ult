# Browser Automation MCP Comparison

Comparison of Playwright, Chrome DevTools, and Claude in Chrome for automated testing and debugging with Claude Code.

## The Three Options

| Feature | Playwright MCP | Chrome DevTools MCP | Claude in Chrome |
|---------|---------------|-------------------|------------------|
| **Setup** | `npx playwright install` | Built into Chrome DevTools | Claude web UI |
| **Speed** | Fast (headless) | Fast | Slowest (manual) |
| **Reliability** | Very high | High | Variable |
| **Automation** | Full | Full | Limited |
| **Screenshots** | ✅ | ✅ | Manual |
| **Console logs** | ✅ | ✅ | Manual copy |
| **Network requests** | ✅ | ✅ | Manual |
| **Parallel** | ✅ | ❌ | ❌ |

## When to Use Which?

### Use Playwright MCP when:
- Running E2E tests (CI/CD)
- Need parallel execution
- Need reliability at scale
- Already have Playwright tests

**Example:**
```bash
/claude playwright --spec e2e/login.spec.ts --headed
```

### Use Chrome DevTools MCP when:
- Debugging a specific issue
- Need to inspect live browser state
- Want to interact manually while Claude observes
- No Playwright setup

**Example:**
```bash
/claude chrome-devtools --url http://localhost:3000 --action "click login button"
```

### Use Claude in Chrome when:
- Quick manual verification
- Visual debugging
- No MCP server available

## Setup Comparison

### Playwright MCP
```bash
npm install -D @playwright/test
npx playwright install
```

Configured in `.mcp.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Chrome DevTools MCP
```bash
npm install -D @puppeteer/browsers
npx playwright install chromium
```

Configured in `.mcp.json`:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chromium", "--remote-debugging-port=9222"]
    }
  }
}
```

## Performance Benchmarks

| Metric | Playwright | Chrome DevTools |
|--------|-----------|-----------------|
| Startup time | ~2s | ~3s |
| Action latency | ~500ms | ~800ms |
| Parallel sessions | 10+ | 1 |
| Memory usage | Low | Medium |

## Best Practices for ULT

1. **Default to Playwright** for automated workflows
2. **Use Chrome DevTools** for interactive debugging
3. **Never use Claude in Chrome** for reproducible tasks

### Debugging Workflow

```bash
# 1. Try automated test first
npm run test:e2e

# 2. If failing, use Chrome DevTools to inspect
/claude chrome-devtools --url http://localhost:3000

# 3. Claude can now see console logs, network, DOM
```

### Example: Debug Login Issue

```bash
/claude debugger-agent --browser chrome-devtools --url http://localhost:3000/login
```

The agent will:
1. Load the page in DevTools
2. Take screenshot
3. Capture console logs
4. Identify the issue
5. Suggest fix

## Limitations

- **Playwright**: Requires test specs, not great for ad-hoc exploration
- **Chrome DevTools**: Single session only, can't parallelize
- **Claude in Chrome**: Manual, not automatable

## Recommendation for Team

Add to `package.json`:
```json
{
  "devDependencies": {
    "@playwright/test": "^1.48.0"
  }
}
```

Add `.mcp.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Then developers can use:
```bash
/claude playwright --url http://localhost:3000
```

---

**Source**: [Browser Automation MCP Comparison](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-in-chrome-v-chrome-devtools-mcp.md)