# Code Review Setup and Credit Management Guide

**Last Updated**: 2026-02-19  
**Status**: 🔴 Action Required - Credits Depleted

---

## 🚨 Current Issue

The `chatgpt-codex-connector` has reached its usage limits for code reviews. This guide provides step-by-step instructions for repository administrators to resolve this issue and prevent future occurrences.

### Issue Details

```
@chatgpt-codex-connector: Codex usage limits have been reached for code reviews.
Credits must be used to enable repository wide code reviews.
```

**Impact**: Automated code reviews are currently unavailable until credits are replenished.

---

## 📋 Quick Action Items for Admins

1. **Immediate**: Add credits to `chatgpt-codex-connector` (see [Step 1](#step-1-adding-credits))
2. **Short-term**: Set up credit monitoring (see [Step 2](#step-2-monitoring-setup))
3. **Long-term**: Implement alternative review strategies (see [Alternative Solutions](#alternative-code-review-solutions))

---

## Step 1: Adding Credits to chatgpt-codex-connector

### Option A: Via GitHub Repository Settings

1. **Navigate to Repository Settings**
   ```
   GitHub.com → kaenozu/Ult → Settings → Code security and analysis
   ```

2. **Access Code Review Settings**
   - Look for "Code review automation" or "Third-party apps"
   - Click on "chatgpt-codex-connector" configuration

3. **Manage Credits**
   - Click "Manage credits" or "Add credits"
   - Select the appropriate credit package
   - Complete the purchase process

### Option B: Via GitHub Organization Settings

1. **Navigate to Organization Billing**
   ```
   GitHub.com → Organizations → kaenozu → Settings → Billing and plans
   ```

2. **Manage Installed Apps**
   - Go to "Installed GitHub Apps"
   - Find "chatgpt-codex-connector"
   - Click "Configure" or "Manage billing"

3. **Add Credits**
   - Select credit package based on repository size
   - Complete the purchase

### Recommended Credit Allocation

Based on the ULT Trading Platform specifications:

| Repository Metric | Value |
|-------------------|-------|
| **Size** | ~50K+ Lines of Code |
| **Activity** | ~50+ PRs per month |
| **Recommended Credits** | **500 credits/month** |

#### Credit Packages by Repository Size

| Repository Size | Monthly PRs | Recommended Credits | Estimated Cost |
|-----------------|-------------|---------------------|----------------|
| Small (~10K LOC) | ~10 PRs | 100 credits/month | $10-20/month |
| Medium (~50K LOC) | ~25 PRs | 250 credits/month | $25-50/month |
| Large (50K+ LOC) | ~50+ PRs | 500 credits/month | $50-100/month |

**For ULT Trading Platform**: Start with **500 credits/month** and adjust based on usage patterns.

---

## Step 2: Monitoring Setup

### A. Enable Credit Alerts

1. **Access Notification Settings**
   - Go to chatgpt-codex-connector settings
   - Enable "Low credit warnings"
   - Set threshold to 20% remaining

2. **Configure Alert Recipients**
   - Add repository admins' email addresses
   - Set up Slack/Discord webhooks (optional)

### B. Create Monitoring Dashboard

Add a monthly review task to track:
- Current credit balance
- Monthly usage rate
- Cost per PR
- ROI of automated reviews

### C. Automated Credit Check Script

Create a GitHub Action to monitor credit status:

```yaml
# .github/workflows/credit-monitor.yml
name: Code Review Credit Monitor

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM
  workflow_dispatch:

jobs:
  check-credits:
    runs-on: ubuntu-latest
    steps:
      - name: Check Credit Status
        run: |
          # Add logic to check chatgpt-codex-connector credits
          # Create an issue if credits are low
          echo "Credit monitoring - implement based on API availability"
```

---

## Step 3: Optimize Credit Usage

### A. Selective Code Review Configuration

Configure `chatgpt-codex-connector` to review only critical files:

```yaml
# .github/codex-config.yml (example)
review:
  include:
    - 'trading-platform/app/lib/**/*.ts'
    - 'trading-platform/app/components/**/*.tsx'
    - 'backend/**/*.py'
  exclude:
    - '**/*.test.ts'
    - '**/*.spec.ts'
    - '**/dist/**'
    - '**/node_modules/**'
    - '**/*.md'
  
  rules:
    # Only review PRs that modify these file types
    file_types:
      - .ts
      - .tsx
      - .py
    
    # Skip review for trivial changes
    skip_if:
      - changed_lines < 10
      - author: 'dependabot'
      - labels: ['dependencies', 'documentation']
```

### B. Batch Review Strategy

Instead of reviewing every commit:
- Group related changes into fewer, larger PRs
- Use draft PRs for work-in-progress (no automatic review)
- Request review only when PR is marked as "Ready for review"

### C. Manual Review Triggers

Configure manual review triggers instead of automatic:
- Use `/codex review` comment to trigger reviews
- Set up review only on specific PR labels
- Disable automatic review for minor updates

---

## Alternative Code Review Solutions

While credits are being replenished or as cost-effective alternatives:

### 1. Built-in GitHub Actions Quality Gates ✅ (Already Implemented)

The repository already has comprehensive quality checks:

```bash
# Existing workflows provide:
- TypeScript type checking (npx tsc --noEmit)
- ESLint code quality checks
- Unit tests with Jest
- E2E tests with Playwright
- Security audits (npm audit)
- Code coverage requirements (80%+)
```

**Usage**: These run automatically on every PR via `.github/workflows/quality-gates.yml`

### 2. GitHub Copilot PR Summaries (Free Alternative)

If team members have GitHub Copilot:
- Copilot provides PR summaries at no extra cost
- Available in PR view sidebar
- Helps reviewers understand changes quickly

### 3. Manual Peer Review Process

Strengthen human code review:

**Review Checklist** (`.github/PULL_REQUEST_TEMPLATE.md`):
```markdown
## Pre-Review Checklist
- [ ] Code follows TypeScript strict mode
- [ ] All tests pass locally
- [ ] No new `any` types added
- [ ] Error handling is complete
- [ ] Security implications considered
- [ ] Performance impact assessed

## Reviewer Checklist
- [ ] Logic is correct and efficient
- [ ] Code is maintainable
- [ ] Tests cover new functionality
- [ ] Documentation is updated
```

### 4. Alternative AI Code Review Tools

Consider these alternatives:

| Tool | Cost | Features |
|------|------|----------|
| **SonarCloud** | Free for open source | Code quality, security, coverage |
| **CodeClimate** | Free for open source | Maintainability, test coverage |
| **DeepSource** | Free for open source | Automated fixes, security |
| **Codacy** | Free tier available | Code quality, standards |

### 5. Self-Hosted Solutions

For long-term cost efficiency:
- **CodeRabbit**: Self-hosted AI reviews
- **Custom GPT-4 Integration**: Via GitHub API
- **Static Analysis**: ESLint + custom rules

---

## Implementation Priority

### Immediate (Week 1)
1. ✅ Purchase and add credits (500/month)
2. ✅ Enable low-credit alerts
3. ✅ Update team on temporary manual review process

### Short-term (Week 2-4)
1. ⏳ Implement selective review configuration
2. ⏳ Set up credit monitoring dashboard
3. ⏳ Document manual review guidelines

### Long-term (Month 2+)
1. ⏳ Evaluate alternative AI review tools
2. ⏳ Optimize credit usage based on 1-month data
3. ⏳ Consider implementing custom review automation

---

## Cost-Benefit Analysis

### Current Situation
- **Cost**: $0/month (depleted)
- **Benefit**: No automated reviews
- **Risk**: Manual review bottlenecks

### With Credits (Recommended)
- **Cost**: $50-100/month (500 credits)
- **Benefit**: Automated reviews, faster PR turnaround
- **ROI**: 2-4 hours saved per week = $200-400/week value

### Alternative Tools
- **Cost**: $0-50/month (varies by tool)
- **Benefit**: Similar to chatgpt-codex-connector
- **Trade-off**: Different feature sets, learning curve

---

## Support and Resources

### Documentation
- [chatgpt-codex-connector Official Docs](https://github.com/apps/chatgpt-codex-connector)
- [GitHub Code Review Best Practices](https://github.com/features/code-review)
- [This Repository's Quality Gates](../.github/workflows/quality-gates.yml)

### Contact
- **Repository Owner**: @kaenozu
- **Admin Team**: [Add team contacts]
- **Support**: Open an issue with label `code-review-support`

### Related Documentation
- [`trading-platform/REVIEW_REPORT.md`](../trading-platform/REVIEW_REPORT.md) - Current status
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) - Development guidelines
- [`docs/PR_1018_REVIEW.md`](../docs/PR_1018_REVIEW.md) - Previous documentation

---

## Troubleshooting

### Issue: Credits Added But Reviews Not Working

**Solution**:
1. Verify credit allocation in settings
2. Check repository access permissions for the app
3. Re-install the chatgpt-codex-connector app if necessary
4. Wait 5-10 minutes for propagation

### Issue: High Credit Consumption

**Solution**:
1. Review which PRs triggered reviews
2. Implement selective review (see [Step 3](#step-3-optimize-credit-usage))
3. Consider excluding test files and documentation
4. Set minimum changed lines threshold

### Issue: Reviews Not Meeting Quality Standards

**Solution**:
1. Customize review prompts in app settings
2. Add custom review rules
3. Supplement with manual peer review
4. Consider alternative tools

---

## Appendix: Command Reference

### Check Current Status
```bash
# View recent PR reviews
gh pr list --state all --limit 10

# Check Quality Gates status
gh workflow view quality-gates.yml

# Run local quality checks
cd trading-platform
npm run lint
npx tsc --noEmit
npm test
```

### Manual Review Commands
```bash
# Request review from team
gh pr review <PR_NUMBER> --comment

# Approve PR
gh pr review <PR_NUMBER> --approve

# Request changes
gh pr review <PR_NUMBER> --request-changes
```

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-19 | Initial guide created | @copilot |
| 2026-02-19 | Added cost-benefit analysis | @copilot |
| 2026-02-19 | Documented alternative solutions | @copilot |

---

**Next Review**: 2026-03-19 (or when credits are added)
