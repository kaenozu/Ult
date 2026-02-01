# Security Policy

## Dependency Security

This project takes dependency security seriously and implements several measures to ensure the integrity and security of our dependencies.

### Package Lock Files

We use `package-lock.json` to ensure consistent and secure dependency installations:

- **Version Control**: All `package-lock.json` files are committed to version control
- **Integrity Checks**: Lock files contain cryptographic hashes (SHA-512) of all packages
- **Exact Versions**: We use exact version pinning via `.npmrc` configuration
- **CI/CD**: We use `npm ci` in all CI/CD pipelines to ensure lock file consistency

### Security Scanning

#### Automated Security Audits

1. **Weekly Scheduled Scans**: Security scans run automatically every Monday at 9:00 UTC
2. **PR Checks**: All pull requests trigger security audits
3. **Push Checks**: Security scans run on pushes to main and develop branches

#### Audit Levels

- **Production Dependencies**: Fail on HIGH and CRITICAL vulnerabilities
- **Development Dependencies**: Monitor but allow moderate vulnerabilities
- **License Compliance**: Automatically reject GPL-3.0 and AGPL-3.0 licenses

### Pre-Commit Hooks

Security checks run automatically before each commit:

```bash
# Audit high/critical vulnerabilities
npm audit --audit-level=high

# Lint and test related files
npx lint-staged
```

### Manual Security Checks

Run security audits manually:

```bash
# Check for vulnerabilities in production dependencies
npm audit --production

# Check all dependencies
npm audit

# Attempt automatic fixes
npm audit fix

# Force fixes (may introduce breaking changes)
npm audit fix --force
```

### Configuration Files

#### .npmrc

Our `.npmrc` files enforce security best practices:

```ini
# Always create package-lock.json
package-lock=true

# Save exact versions (not ^ or ~)
save-exact=true

# Fail on high and critical vulnerabilities
audit-level=high

# Automatically run audit after install
audit=true
```

### Dependency Updates

When updating dependencies:

1. Review the changelog for security-related changes
2. Run `npm audit` after updates
3. Test thoroughly before committing
4. Ensure `package-lock.json` is updated and committed

### Backend Python Dependencies

Python dependencies are also scanned for vulnerabilities using the `safety` tool:

```bash
# From the backend directory
safety check --file requirements.txt
```

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by:

1. **Do NOT** create a public GitHub issue
2. Email the maintainers directly (contact information in repository)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond to security reports within 48 hours.

## Security Best Practices for Contributors

When contributing to this project:

1. **Never commit secrets**: Use environment variables for sensitive data
2. **Review dependencies**: Check npm package reputation before adding new dependencies
3. **Update regularly**: Keep dependencies up to date with security patches
4. **Run security scans**: Always run `npm audit` before creating a PR
5. **Follow secure coding**: Use DOMPurify for sanitization, validate inputs, handle errors properly

## Security Tooling

This project uses:

- **npm audit**: Vulnerability scanning for Node.js dependencies
- **GitHub Dependency Review**: PR dependency change analysis
- **safety**: Python dependency vulnerability scanning
- **Husky + lint-staged**: Pre-commit security checks
- **DOMPurify**: XSS protection for user-generated content
- **CodeQL** (if enabled): Static code analysis for security issues

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Updates

Security patches are released as soon as possible after a vulnerability is confirmed. Update to the latest version to receive security fixes.
