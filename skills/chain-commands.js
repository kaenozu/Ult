const { execSync } = require('child_process');

// 最初の2つの引数（nodeパスとスクリプトパス）を除いた残りをコマンドとして取得
const commands = process.argv.slice(2);

if (commands.length === 0) {
  console.error('Error: No commands provided.');
  console.error('Usage: node skills/chain-commands.js "command1" "command2" ...');
  process.exit(1);
}

/**
 * Validates command to prevent dangerous operations
 * @param {string} cmd - The command to validate
 * @returns {boolean} - True if command is safe
 */
function validateCommand(cmd) {
  // Whitelist of allowed command prefixes
  const allowedPrefixes = [
    'npm ',
    'node ',
    'git ',
    'npx ',
    'pnpm ',
    'yarn ',
    'echo ',
    'cat ',
    'ls ',
    'pwd',
    'cd ',
  ];
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /rm\s+-rf\s+\//, // Prevent deletion of root
    />\s*\/dev\//, // Prevent writing to device files
    /curl.*\|\s*bash/, // Prevent piping to shell
    /wget.*\|\s*sh/, // Prevent piping to shell
    /eval\s+/, // Prevent eval
    /exec\s+/, // Prevent exec
  ];
  
  // Check for dangerous patterns
  for (const pattern of dangerousPatterns) {
    if (pattern.test(cmd)) {
      console.error(`❌ Dangerous pattern detected in command: ${cmd}`);
      return false;
    }
  }
  
  // Check if command starts with allowed prefix
  const hasAllowedPrefix = allowedPrefixes.some(prefix => cmd.trim().startsWith(prefix));
  
  if (!hasAllowedPrefix) {
    console.warn(`⚠️  Warning: Command "${cmd}" doesn't start with a known safe prefix.`);
    console.warn('Allowed prefixes:', allowedPrefixes.join(', '));
    // Still allow it but warn the user
  }
  
  return true;
}

console.log(`🚀 Starting execution of ${commands.length} commands...`);

try {
  for (const [index, cmd] of commands.entries()) {
    console.log(`\n[${index + 1}/${commands.length}] 🏃 Executing: ${cmd}`);
    
    // Validate command before execution
    if (!validateCommand(cmd)) {
      throw new Error(`Command validation failed: ${cmd}`);
    }
    
    // Execute command with shell: true (required for complex commands)
    // The validation above helps mitigate injection risks
    execSync(cmd, { stdio: 'inherit', shell: true });
  }
  console.log('\n✅ All commands completed successfully.');
} catch (error) {
  console.error('\n❌ Execution stopped due to an error.');
  console.error('Details:', error.message);
  process.exit(1);
}
