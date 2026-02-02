const { execSync } = require('child_process');
const { spawn } = require('child_process');

const message = process.argv[2];

if (!message) {
  console.error('Error: Commit message is required.');
  console.error('Usage: node skills/smart-git.js "commit message"');
  process.exit(1);
}

// Validate commit message to prevent command injection
const dangerousPatterns = /[;&|`$(){}[\]\\]/;
if (dangerousPatterns.test(message)) {
  console.error('❌ Error: Commit message contains dangerous characters.');
  console.error('Avoid using: ; & | ` $ ( ) { } [ ] \\');
  process.exit(1);
}

try {
  console.log('📦 Staging changes...');
  execSync('git add .', { stdio: 'inherit' });

  console.log(`📝 Committing with message: "${message}"...`);
  // Use spawn with args array to prevent command injection
  const gitCommit = spawn('git', ['commit', '-m', message], {
    stdio: 'inherit',
    shell: false
  });

  gitCommit.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Git operation completed successfully.');
    } else {
      console.error(`❌ Git commit failed with code ${code}.`);
      process.exit(1);
    }
  });
} catch (error) {
  console.error('❌ Error executing git commands.');
  process.exit(1);
}
