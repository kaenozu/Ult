#!/usr/bin/env node

/**
 * Auto Runner Agent
 * 
 * Automatically runs development tasks:
 * - Watch mode: Run tasks on file changes
 * - Schedule mode: Run tasks at intervals
 * - Pre-commit mode: Run before git commits
 * 
 * Usage:
 *   node skills/auto-runner.js watch --tasks build,test
 *   node skills/auto-runner.js schedule --interval 300
 *   node skills/auto-runner.js pre-commit
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class AutoRunner {
  constructor(options = {}) {
    this.projectDir = options.projectDir || path.join(__dirname, '..', 'trading-platform');
    this.tasks = options.tasks || ['build', 'test'];
    this.watchDir = options.watchDir || path.join(this.projectDir, 'app');
    this.interval = options.interval || 60;
    this.isRunning = false;
    this.lastCheck = Date.now();
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      watch: '\x1b[35m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
  }

  async runTask(task) {
    const taskCommands = {
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint',
      typecheck: 'npx tsc --noEmit',
      format: 'npx prettier --write .'
    };

    const command = taskCommands[task] || task;
    this.log(`Running: ${command}`, 'info');

    return new Promise((resolve, reject) => {
      const proc = spawn(command, {
        shell: true,
        cwd: this.projectDir,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ code, stdout, stderr, task });
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runAllTasks() {
    if (this.isRunning) {
      this.log('Previous run still in progress, skipping...', 'warning');
      return;
    }

    this.isRunning = true;
    const results = [];

    for (const task of this.tasks) {
      try {
        const result = await this.runTask(task);
        results.push({
          task,
          success: result.code === 0,
          output: result.stdout.substring(0, 500)
        });
        this.log(`${task}: ${result.code === 0 ? '✓ PASSED' : '✗ FAILED'}`, result.code === 0 ? 'success' : 'error');
      } catch (error) {
        results.push({ task, success: false, error: error.message });
        this.log(`${task}: ✗ ERROR - ${error.message}`, 'error');
      }
    }

    this.isRunning = false;

    const allPassed = results.every(r => r.success);
    this.log(`\nSummary: ${allPassed ? '✓ All tasks passed' : '✗ Some tasks failed'}`, allPassed ? 'success' : 'error');

    return { success: allPassed, results };
  }

  // Watch mode: Monitor file changes and run tasks
  async watch() {
    this.log(`Watching directory: ${this.watchDir}`, 'watch');
    this.log(`Tasks: ${this.tasks.join(', ')}`, 'info');
    this.log('Press Ctrl+C to stop...\n', 'warning');

    const watchedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];

    const checkForChanges = () => {
      const files = this.getFilesRecursive(this.watchDir);
      const recentChanges = files.filter(file => {
        const stats = fs.statSync(file);
        return stats.mtimeMs > this.lastCheck;
      });

      if (recentChanges.length > 0) {
        this.log(`\nDetected ${recentChanges.length} file(s) changed:`, 'watch');
        recentChanges.slice(0, 5).forEach(f => {
          const relPath = path.relative(this.projectDir, f);
          this.log(`  - ${relPath}`, 'watch');
        });
        if (recentChanges.length > 5) {
          this.log(`  ... and ${recentChanges.length - 5} more`, 'watch');
        }

        this.log('\nRunning tasks...', 'info');
        this.runAllTasks().then(() => {
          this.lastCheck = Date.now();
        });
      }
    };

    // Initial run
    this.lastCheck = Date.now();
    await this.runAllTasks();

    // Watch for changes
    setInterval(checkForChanges, 2000);
  }

  // Schedule mode: Run tasks at regular intervals
  async schedule() {
    this.log(`Scheduled auto-run every ${this.interval} seconds`, 'info');
    this.log('Press Ctrl+C to stop...\n', 'warning');

    const runScheduled = async () => {
      const now = new Date().toLocaleTimeString();
      this.log(`\n[${now}] Scheduled run:`, 'watch');
      await this.runAllTasks();
    };

    // Initial run
    await runScheduled();

    // Schedule
    setInterval(runScheduled, this.interval * 1000);
  }

  // Pre-commit mode: Run before git commits
  async preCommit() {
    this.log('Running pre-commit checks...', 'info');

    const result = await this.runAllTasks();

    if (!result.success) {
      this.log('\n✗ Pre-commit checks failed!', 'error');
      this.log('Please fix the issues before committing.', 'warning');
      process.exit(1);
    }

    this.log('\n✓ Pre-commit checks passed!', 'success');
    process.exit(0);
  }

  // Get status of auto-runner
  async status() {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(this.projectDir, 'package.json'), 'utf8')
    );

    const scripts = Object.entries(packageJson.scripts || {})
      .filter(([name]) => ['build', 'test', 'lint'].includes(name))
      .map(([name, cmd]) => ({ name, command: cmd }));

    return {
      project: this.projectDir,
      scripts,
      skills: this.listSkills(),
      autoRunner: {
        tasks: this.tasks,
        watchDir: this.watchDir,
        interval: this.interval
      }
    };
  }

  listSkills() {
    const skillsDir = path.join(__dirname);
    if (!fs.existsSync(skillsDir)) return [];
    
    return fs.readdirSync(skillsDir)
      .filter(f => f.endsWith('.json') && f !== 'auto-runner.json')
      .map(f => f.replace('.json', ''));
  }

  getFilesRecursive(dir) {
    if (!fs.existsSync(dir)) return [];
    
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.getFilesRecursive(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('AUTO RUNNER REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Tasks: ${this.tasks.join(', ')}`);
    console.log('');

    if (results) {
      results.results.forEach(r => {
        console.log(`  ${r.success ? '✓' : '✗'} ${r.task}`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'status';

  const tasks = args
    .find(a => a.startsWith('--tasks='))
    ?.split('=')[1]
    ?.split(',') || ['build', 'test'];

  const interval = parseInt(
    args.find(a => a.startsWith('--interval='))?.split('=')[1] || '60'
  );

  const runner = new AutoRunner({
    projectDir: path.join(__dirname, '..', 'trading-platform'),
    tasks,
    interval
  });

  let results;

  switch (action) {
    case 'watch':
      await runner.watch();
      break;

    case 'schedule':
      await runner.schedule();
      break;

    case 'pre-commit':
      await runner.preCommit();
      break;

    case 'status':
      results = await runner.status();
      console.log(JSON.stringify(results, null, 2));
      break;

    case 'run':
      results = await runner.runAllTasks();
      runner.generateReport(results);
      break;

    case 'help':
    default:
      console.log(`
Auto Runner Agent
=================
Automatically run development tasks.

Usage: node skills/auto-runner.js <action> [options]

Actions:
  watch        Watch for file changes and run tasks
  schedule     Run tasks at regular intervals
  pre-commit   Run before git commits (CI/CD)
  run          Run tasks once
  status       Show current configuration
  help         Show this help

Options:
  --tasks=build,test,lint    Tasks to run
  --interval=300             Interval in seconds (schedule mode)

Examples:
  # Watch for changes and run build+test
  node skills/auto-runner.js watch --tasks=build,test

  # Run every 5 minutes
  node skills/auto-runner.js schedule --interval=300

  # Git pre-commit hook
  node skills/auto-runner.js pre-commit

  # Run once
  node skills/auto-runner.js run --tasks=build,lint
      `);
      return;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AutoRunner };
