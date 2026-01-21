const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Map targets to script paths (relative to project root)
const TARGETS = {
  'time-machine': 'verify_time_machine.py',
  'router': 'verify_strategy_router.py',
  'hive': 'tests/verify_hive.py',
  'news': 'tests/verify_news.py',
  'vision': 'tests/verify_vision_consensus.py',
  'all': 'ALL' 
};

const args = process.argv.slice(2);
const targetKey = args[0];

if (!targetKey || !TARGETS[targetKey]) {
  console.error(`Usage: node run_verification.cjs <target>`);
  console.error(`Available targets: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '../../..'); // Assuming skill is in skills-dev/name/scripts
const backendPath = path.join(projectRoot, 'backend');

// Helper to run a single python script
function runScript(scriptRelPath) {
  return new Promise((resolve, reject) => {
    console.log(`
--- Running verification: ${scriptRelPath} ---`);
    
    const scriptPath = path.join(projectRoot, scriptRelPath);
    
    // Set PYTHONPATH to include backend
    const env = { ...process.env, PYTHONPATH: backendPath };
    
    const pythonProcess = spawn('python', [scriptPath], {
      env,
      cwd: projectRoot, // Run from root so relative paths in python work
      stdio: 'inherit',
      shell: true 
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Success: ${scriptRelPath}`);
        resolve();
      } else {
        console.error(`❌ Failed: ${scriptRelPath} (Exit Code: ${code})`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    if (targetKey === 'all') {
      const allScripts = Object.values(TARGETS).filter(t => t !== 'ALL');
      for (const script of allScripts) {
        await runScript(script);
      }
    } else {
      await runScript(TARGETS[targetKey]);
    }
    console.log('
✨ All requested verifications completed.');
  } catch (error) {
    console.error('
💥 Verification process failed.');
    process.exit(1);
  }
}

main();
