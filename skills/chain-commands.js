const { execSync } = require('child_process');

// 最初の2つの引数（nodeパスとスクリプトパス）を除いた残りをコマンドとして取得
const commands = process.argv.slice(2);

if (commands.length === 0) {
  console.error('Error: No commands provided.');
  console.error('Usage: node skills/chain-commands.js "command1" "command2" ...');
  process.exit(1);
}

console.log(`🚀 Starting execution of ${commands.length} commands...`);

try {
  for (const [index, cmd] of commands.entries()) {
    console.log(`\n[${index + 1}/${commands.length}] 🏃 Executing: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
  }
  console.log('\n✅ All commands completed successfully.');
} catch (error) {
  console.error('\n❌ Execution stopped due to an error.');
  process.exit(1);
}
