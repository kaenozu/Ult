const { execSync } = require('child_process');

const message = process.argv[2];

if (!message) {
  console.error('Error: Commit message is required.');
  console.error('Usage: node skills/smart-git.js "commit message"');
  process.exit(1);
}

try {
  console.log('📦 Staging changes...');
  execSync('git add .', { stdio: 'inherit' });

  console.log(`📝 Committing with message: "${message}"...`);
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

  console.log('✅ Git operation completed successfully.');
} catch (error) {
  console.error('❌ Error executing git commands.');
  process.exit(1);
}
