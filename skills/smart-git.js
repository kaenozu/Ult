const { execSync } = require('child_process');

const message = process.argv[2];

if (!message) {
  console.error('Error: Commit message is required.');
  console.error('Usage: node skills/smart-git.js "commit message"');
  process.exit(1);
}

/**
 * Escapes shell special characters to prevent command injection
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string safe for shell execution
 */
function escapeShellArg(str) {
  // Replace all single quotes with '\'' and wrap in single quotes
  // This is the safest way to escape shell arguments
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

try {
  console.log('📦 Staging changes...');
  execSync('git add .', { stdio: 'inherit' });

  console.log(`📝 Committing with message: "${message}"...`);
  // Use escaped message to prevent command injection
  const safeMessage = escapeShellArg(message);
  execSync(`git commit -m ${safeMessage}`, { stdio: 'inherit' });

  console.log('✅ Git operation completed successfully.');
} catch (error) {
  console.error('❌ Error executing git commands.');
  console.error('Details:', error.message);
  process.exit(1);
}
