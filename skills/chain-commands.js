const { spawn } = require('child_process');

// 最初の2つの引数（nodeパスとスクリプトパス）を除いた残りをコマンドとして取得
const commands = process.argv.slice(2);

if (commands.length === 0) {
  console.error('Error: No commands provided.');
  console.error('Usage: node skills/chain-commands.js "command1" "command2" ...');
  process.exit(1);
}

// Whitelist of allowed commands for security
const ALLOWED_COMMANDS = ['git', 'npm', 'yarn', 'node', 'python', 'pytest', 'eslint', 'tsc'];

/**
 * Validates command to prevent dangerous operations
 * Combines main's whitelist approach with HEAD's pattern detection
 * @param {string} cmd - The command to validate
 * @returns {object} - { valid: boolean, reason: string }
 */
function validateCommand(cmd) {
  // Check for dangerous shell metacharacters (from main)
  const dangerousCharacters = /[;&|`$(){}[\]\\]/;
  if (dangerousCharacters.test(cmd)) {
    return { valid: false, reason: 'Contains dangerous shell characters' };
  }

  // Additional dangerous patterns (from HEAD)
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
      return { valid: false, reason: `Dangerous pattern detected in command: ${cmd}` };
    }
  }

  // Parse command to get the base command (from main)
  const baseCommand = cmd.trim().split(/\s+/)[0];

  // Check if command is in whitelist
  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    return { valid: false, reason: `Command '${baseCommand}' is not in allowed list` };
  }

  return { valid: true };
}

console.log(`🚀 Starting execution of ${commands.length} commands...`);

async function executeCommand(cmd, index, total) {
  return new Promise((resolve, reject) => {
    console.log(`\n[${index + 1}/${total}] 🏃 Executing: ${cmd}`);

    // Parse command into parts
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    // Use spawn with shell: false for security (from main)
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    // Validate all commands first
    for (const cmd of commands) {
      const validation = validateCommand(cmd);
      if (!validation.valid) {
        console.error(`❌ Security Error: Command validation failed for "${cmd}"`);
        console.error(`   Reason: ${validation.reason}`);
        process.exit(1);
      }
    }

    // Execute commands sequentially
    for (const [index, cmd] of commands.entries()) {
      await executeCommand(cmd, index, commands.length);
    }

    console.log('\n✅ All commands completed successfully.');
  } catch (error) {
    console.error('\n❌ Execution stopped due to an error.');
    console.error(error.message);
    process.exit(1);
  }
}

main();
