# .github Directory Documentation

This directory contains GitHub-specific configuration files and documentation for the ULT Trading Platform repository.

## 📁 Directory Structure

```
.github/
├── workflows/              # GitHub Actions workflows
├── scripts/                # Utility scripts for workflows
├── CODE_REVIEW_SETUP.md    # 🚨 Admin guide for code review credits
├── ADMIN_ACTION_REQUIRED.md # Quick action guide for admins
└── README.md               # This file
```

## 🚨 Current Action Items

### Code Review Credits Depleted

**Status**: 🔴 **REQUIRES IMMEDIATE ADMIN ACTION**

The `chatgpt-codex-connector` automated code review system has run out of credits.

**Quick Links**:
- 🔴 [Admin Action Required](./ADMIN_ACTION_REQUIRED.md) - **READ THIS FIRST**
- 📖 [Complete Setup Guide](./CODE_REVIEW_SETUP.md) - Detailed instructions
- 📊 [Credit Monitor Workflow](./workflows/credit-monitor.yml) - Automated monitoring

**For Admins**: 
1. Read [ADMIN_ACTION_REQUIRED.md](./ADMIN_ACTION_REQUIRED.md)
2. Add 500 credits to chatgpt-codex-connector
3. Enable low-credit alerts
4. Mark as complete in the document

**For Contributors**:
While credits are being added, use manual peer review and the existing Quality Gates workflows.

---

## 📋 Workflows

All GitHub Actions workflows that run automatically on PRs, pushes, and schedules.

### Active Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **quality-gates.yml** | PR, Push | Comprehensive quality checks (lint, test, build) |
| **ci.yml** | PR, Push | Continuous Integration checks |
| **pr-review-to-issue.yml** | PR Closed | Creates issues from PR review comments |
| **process-all-review-comments.yml** | Schedule (4h) | Processes recent PR comments |
| **weekly-review-report.yml** | Schedule (Mon) | Weekly summary of reviews |
| **credit-monitor.yml** | Schedule (Mon) | 🆕 Monitors code review credits |
| **test-pr-close.yml** | PR Closed | Test automation |
| **simple-test.yml** | Push | Simple validation tests |
| **weekly-test.yml** | Schedule (Sun) | Weekly regression tests |
| **deploy-review-dashboard.yml** | Manual | Deploy review dashboard |

### Adding New Workflows

1. Create file in `.github/workflows/`
2. Follow naming convention: `kebab-case.yml`
3. Test locally with [act](https://github.com/nektos/act) if possible
4. Add to this README under "Active Workflows"
5. Validate with `.github/scripts/validate-workflows.sh`

---

## 🔧 Scripts

Utility scripts used by workflows or for local development.

| Script | Purpose |
|--------|---------|
| **validate-workflows.sh** | Validates all workflow YAML files |

---

## 📖 Documentation Files

### For Repository Administrators

- **[CODE_REVIEW_SETUP.md](./CODE_REVIEW_SETUP.md)**
  - Complete guide to managing code review credits
  - Step-by-step setup instructions
  - Cost optimization strategies
  - Alternative review solutions
  - Troubleshooting guide

- **[ADMIN_ACTION_REQUIRED.md](./ADMIN_ACTION_REQUIRED.md)**
  - Quick reference for immediate actions
  - 10-15 minute setup guide
  - Current issue resolution
  - Status tracking checklist

### For Contributors

Reference these documents when:
- Setting up automated code reviews
- Understanding CI/CD workflows
- Troubleshooting workflow issues
- Contributing to workflow improvements

---

## 🔗 Related Documentation

### Main Repository Docs
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines
- [README.md](../README.md) - Project overview
- [SECURITY.md](../SECURITY.md) - Security policies

### Additional Guides
- [docs/CI_CD_GUIDE.md](../docs/CI_CD_GUIDE.md) - CI/CD detailed guide
- [trading-platform/REVIEW_REPORT.md](../trading-platform/REVIEW_REPORT.md) - Quality status

---

## 🆘 Getting Help

### Issues with Code Review Credits
1. Check [ADMIN_ACTION_REQUIRED.md](./ADMIN_ACTION_REQUIRED.md)
2. Contact repository administrators
3. Open issue with label `code-review-support`

### Workflow Issues
1. Check workflow logs in GitHub Actions tab
2. Run validation: `.github/scripts/validate-workflows.sh`
3. Open issue with label `workflow-issue`

### General Questions
1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Check existing issues and discussions
3. Ask in repository discussions

---

## 📝 Maintenance Checklist

### Weekly
- [ ] Review credit monitor workflow output
- [ ] Check for failed workflows
- [ ] Review open issues with `code-review-*` labels

### Monthly
- [ ] Review credit usage patterns
- [ ] Optimize workflow efficiency
- [ ] Update documentation as needed
- [ ] Clean up old workflow runs

### Quarterly
- [ ] Evaluate alternative code review tools
- [ ] Review credit allocation
- [ ] Update cost-benefit analysis
- [ ] Archive outdated workflows

---

## 🔄 Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-19 | Added code review credit documentation | @copilot |
| 2026-02-19 | Added credit-monitor workflow | @copilot |
| 2026-02-19 | Created .github README | @copilot |

---

**Last Updated**: 2026-02-19
