# Codex Usage Limits Guide

## Overview

This document addresses the Codex usage limits issue that has been encountered for automated code reviews in this repository.

## Issue Description

The `@chatgpt-codex-connector` bot has reported that **Codex usage limits have been reached** for code reviews. This prevents automated code reviews from functioning until the limits are increased.

**Related Issues:**
- Issue #1060: Initial Codex usage limit notification
- PR #1072: Created to address this issue

## What is Codex?

GitHub Codex (powered by OpenAI) is an AI system that provides:
- Automated code review suggestions
- Code quality analysis
- Security vulnerability detection
- Best practice recommendations

## Current Status

✅ **PR #1072 Status:** Merged (2026-02-19)
⚠️ **Usage Limits:** Reached - requires admin action

## Action Required: For Repository Administrators

### Immediate Steps

1. **Check Current Usage:**
   - Navigate to repository Settings → GitHub Advanced Security
   - Review Codex API usage and quotas
   - Check billing and credit status

2. **Increase Limits by Adding Credits:**
   - Go to Organization/Account Settings → Billing
   - Navigate to the Codex/AI Services section
   - Add credits or increase the monthly quota
   - Ensure credits are allocated for repository-wide code reviews

3. **Configure Usage Policies:**
   - Set appropriate usage limits per repository
   - Configure auto-renewal if desired
   - Set up billing alerts to prevent future disruptions

### Long-term Solutions

#### Option 1: Increase Codex Credits (Recommended)
- Purchase additional Codex credits through GitHub billing
- Set up auto-renewal to prevent future interruptions
- Monitor usage patterns and adjust limits accordingly

#### Option 2: Optimize Usage
- Configure Codex to run only on specific file types or directories
- Limit automated reviews to critical PRs
- Use sampling instead of reviewing every PR

#### Option 3: Alternative Tools
Consider supplementing or replacing Codex with:
- **SonarQube:** For code quality and security analysis
- **CodeQL:** GitHub's native semantic code analysis
- **ESLint/TSLint:** For TypeScript/JavaScript linting
- **pytest-cov:** For Python test coverage
- **Custom Review Bots:** Implement lightweight custom checks

## Workflow Configuration

Our current GitHub Actions workflows for code review:

### 1. PR Review to Issue (`pr-review-to-issue.yml`)
- Converts PR review comments into tracking issues
- Runs on PR closure
- **Does NOT use Codex** - safe to continue using

### 2. Process All Review Comments (`process-all-review-comments.yml`)
- Batch processes review comments from merged PRs
- Runs every 4 hours
- **Does NOT use Codex** - safe to continue using

### 3. Quality Gates (`quality-gates.yml`)
- Runs tests, linting, and security checks
- **May use Codex** for enhanced analysis
- Consider disabling Codex integration temporarily

## Temporary Workarounds

While waiting for credit approval:

### 1. Disable Codex-dependent Workflows
```yaml
# In .github/workflows/*, comment out Codex steps:
# - name: Codex Code Review
#   uses: github/codex-action@v1
#   with:
#     token: ${{ secrets.CODEX_TOKEN }}
```

### 2. Use Native GitHub Features
- Enable GitHub Advanced Security (GHAS) if available
- Use CodeQL for security scanning
- Configure Dependabot for dependency updates

### 3. Manual Reviews
- Increase peer review requirements
- Use PR templates with checklists
- Implement pre-commit hooks locally

## Monitoring Usage

To prevent future issues:

### Set Up Alerts
1. **Billing Alerts:**
   - GitHub Settings → Billing → Spending limits
   - Set up email notifications

2. **Usage Tracking:**
   - Monitor API usage in GitHub Insights
   - Review monthly usage reports
   - Track trends over time

### Usage Best Practices
- Review large PRs manually to save credits
- Use Codex for security-critical reviews
- Batch process less critical changes
- Configure file/directory exclusions

## Cost Considerations

### Typical Codex Costs (as of 2026)
- Small repos: ~$50-100/month
- Medium repos: ~$200-500/month
- Large active repos: ~$1000+/month

**Note:** Costs vary based on:
- Repository size and activity
- Number of PRs reviewed
- File types and languages
- Enabled features

## Support Contacts

For assistance with Codex usage:

1. **GitHub Support:**
   - Email: support@github.com
   - Portal: https://support.github.com

2. **Billing Issues:**
   - GitHub Settings → Billing → Contact Support
   - Include repository name and usage details

3. **Repository Owner:**
   - Contact: @kaenozu
   - For internal policy decisions

## Next Steps

### For Admins
1. ✅ Review this document
2. ⏳ Check current Codex usage and limits
3. ⏳ Decide on credit increase or alternatives
4. ⏳ Implement chosen solution
5. ⏳ Document decision in repository

### For Contributors
1. ✅ Be aware of the limitation
2. ⏳ Continue with manual reviews if needed
3. ⏳ Report any review-related issues
4. ⏳ Follow updated review guidelines

## Additional Resources

- [GitHub Advanced Security Documentation](https://docs.github.com/en/code-security)
- [GitHub Copilot for Business](https://docs.github.com/en/copilot)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Repository Security Best Practices](./SECURITY.md)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-19 | Initial document creation | GitHub Copilot |
| 2026-02-19 | Added workarounds and alternatives | GitHub Copilot |

---

**Last Updated:** 2026-02-19
**Status:** Action Required - Awaiting Admin Decision
