const { execSync } = require('child_process');
const path = require('path');

function runBacktest() {
  const platformDir = path.join(process.cwd(), 'trading-platform');
  console.log('--- Strategy Backtest Summary ---');
  
  try {
    // Run the backtest test and capture output
    const output = execSync('npm test app/lib/backtest.test.ts', {
      cwd: platformDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Simple parsing logic (can be expanded)
    if (output.includes('PASS')) {
      console.log('✅ Backtest simulation completed successfully.');
      console.log('Status: ACTIVE');
    } else {
      console.log('❌ Backtest failed or yielded poor results.');
      console.log('Status: INACTIVE');
    }
  } catch (error) {
    console.error('Error executing backtest:', error.message);
    process.exit(1);
  }
}

runBacktest();
