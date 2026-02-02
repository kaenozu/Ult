const { spawn } = require('child_process');

const message = process.argv[2];

if (!message) {
  console.error('Error: Commit message is required.');
  console.error('Usage: node skills/smart-git.js "commit message"');
  process.exit(1);
}

// Validate commit message to prevent command injection (from main)
const dangerousPatterns = /[;&|`$(){}[\]\\]/;
if (dangerousPatterns.test(message)) {
  console.error('❌ Error: Commit message contains dangerous characters.');
  console.error('Avoid using: ; & | ` $ ( ) { } [ ] \\');
  process.exit(1);
}

console.log('📦 Staging changes...');
const gitAdd = spawn('git', ['add', '.'], {
  stdio: 'inherit',
  shell: false
});

gitAdd.on('close', (addCode) => {
  if (addCode !== 0) {
    console.error(`❌ Git add failed with code ${addCode}.`);
    process.exit(1);
  }

  console.log(`📝 Committing with message: "${message}"...`);
  // Use spawn with args array to prevent command injection (from main)
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

  gitCommit.on('error', (error) => {
    console.error('❌ Error executing git commit.');
    console.error('Details:', error.message);
    process.exit(1);
  });
});

gitAdd.on('error', (error) => {
  console.error('❌ Error executing git add.');
  console.error('Details:', error.message);
  process.exit(1);
});
