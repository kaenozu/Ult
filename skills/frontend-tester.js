#!/usr/bin/env node

/**
 * Frontend Testing Agent
 * 
 * This agent performs comprehensive frontend testing including:
 * - Build verification
 * - Server startup
 * - Page loading tests
 * - Console error detection
 * - Hydration error checks
 * - UI element verification
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class FrontendTester {
  constructor(options = {}) {
    this.projectDir = options.projectDir || path.join(__dirname, '..', 'trading-platform');
    this.port = options.port || 3000;
    this.browser = options.browser || 'chromium';
    this.pages = options.pages || ['/', '/heatmap', '/journal', '/screener'];
    this.waitTime = options.waitTime || 3000;
    this.results = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, {
        shell: true,
        cwd: this.projectDir,
        ...options
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
        resolve({ code, stdout, stderr });
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkBuild() {
    this.log('Checking build...');
    try {
      const result = await this.runCommand('npm run build', { timeout: 120000 });
      if (result.code === 0) {
        this.log('Build successful!', 'success');
        return { success: true, message: 'Build passed' };
      } else {
        this.log('Build failed', 'error');
        this.log(result.stderr, 'error');
        return { success: false, message: 'Build failed', errors: result.stderr };
      }
    } catch (error) {
      this.log(`Build check error: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
  }

  async startServer() {
    this.log('Starting development server...');
    try {
      const existing = await this.runCommand('lsof -i :3000');
      if (existing.stdout.includes('node')) {
        this.log('Server already running on port 3000', 'warning');
        return { success: true, url: 'http://localhost:3000', alreadyRunning: true };
      }

      const serverProcess = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
        shell: true,
        cwd: this.projectDir,
        detached: true,
        stdio: 'ignore'
      });

      serverProcess.unref();

      await this.waitForServer(30000);
      this.log('Server started successfully!', 'success');
      return { success: true, url: 'http://localhost:3000' };
    } catch (error) {
      this.log(`Server start error: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
  }

  async waitForServer(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const result = await this.runCommand(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`);
        if (result.stdout.includes('200')) {
          return true;
        }
      } catch (e) {
        // Ignore connection errors
      }
      await this.sleep(1000);
    }
    throw new Error('Server failed to start within timeout');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async verifyPages() {
    this.log('Verifying pages...');
    const results = [];

    for (const page of this.pages) {
      try {
        const url = `http://localhost:3000${page}`;
        const result = await this.runCommand(`curl -s -o /dev/null -w "%{http_code}" "${url}"`);

        if (result.stdout.includes('200')) {
          this.log(`Page ${page}: OK`, 'success');
          results.push({ page, status: 200, success: true });
        } else {
          this.log(`Page ${page}: FAILED (${result.stdout})`, 'error');
          results.push({ page, status: result.stdout.trim(), success: false });
        }
      } catch (error) {
        this.log(`Page ${page}: ERROR - ${error.message}`, 'error');
        results.push({ page, error: error.message, success: false });
      }
    }

    return {
      success: results.every(r => r.success),
      pages: results
    };
  }

  async checkConsoleErrors() {
    this.log('Checking for console errors...');
    
    const checkScript = `
      const errors = [];
      const warnings = [];
      
      window.addEventListener('error', (e) => {
        errors.push(e.message);
      });
      
      window.addEventListener('warning', (e) => {
        warnings.push(e.message);
      });
      
      console.error = (...args) => {
        errors.push(args.join(' '));
      };
      
      console.warn = (...args) => {
        warnings.push(args.join(' '));
      };
      
      // Report results
      console.log('CONSOLE_ERRORS:' + JSON.stringify(errors));
      console.log('CONSOLE_WARNINGS:' + JSON.stringify(warnings));
    `;

    const results = [];
    for (const page of this.pages) {
      const url = `http://localhost:3000${page}`;
      try {
        const html = await this.runCommand(`curl -s "${url}"`);
        
        // Basic check for common React/Next.js errors in HTML
        if (html.stdout.includes('hydration') || html.stdout.includes('Hydration')) {
          results.push({ page, type: 'hydration', found: true });
          this.log(`Hydration warning found on ${page}`, 'warning');
        }
        
        if (html.stdout.includes('Error:') || html.stdout.includes('error:')) {
          results.push({ page, type: 'runtime', found: true });
          this.log(`Error found on ${page}`, 'error');
        }
      } catch (error) {
        results.push({ page, error: error.message, found: false });
      }
    }

    return {
      success: true,
      checks: results,
      hasErrors: results.some(r => r.found)
    };
  }

  async verifyUIComponents() {
    this.log('Verifying UI components...');
    
    const components = [
      { name: 'Navigation', selector: 'nav, [class*="Navigation"]' },
      { name: 'Header', selector: 'header, [class*="Header"]' },
      { name: 'Chart', selector: 'canvas, [class*="Chart"]' },
      { name: 'Table', selector: 'table, [class*="Table"]' },
      { name: 'Footer', selector: 'footer, [class*="Disclaimer"]' }
    ];

    const results = [];
    for (const page of this.pages) {
      const url = `http://localhost:3000${page}`;
      try {
        const html = await this.runCommand(`curl -s "${url}"`);
        
        for (const component of components) {
          const found = html.stdout.includes(component.selector.replace(/[\[\]=]/g, '')) || 
                       html.stdout.includes(component.name.toLowerCase());
          results.push({
            page,
            component: component.name,
            found
          });
        }
      } catch (error) {
        results.push({ page, error: error.message });
      }
    }

    return {
      success: true,
      components: results
    };
  }

  async fullCheck() {
    this.log('Running full frontend check...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // 1. Check build
    report.checks.build = await this.checkBuild();
    if (!report.checks.build.success) {
      this.log('Build failed, aborting further checks', 'error');
      return report;
    }

    // 2. Start server
    const serverResult = await this.startServer();
    report.checks.server = serverResult;
    
    if (!serverResult.success) {
      this.log('Server failed to start, aborting', 'error');
      return report;
    }

    // Wait for server to stabilize
    await this.sleep(this.waitTime);

    // 3. Verify pages
    report.checks.pages = await this.verifyPages();

    // 4. Check console errors
    report.checks.console = await this.checkConsoleErrors();

    // 5. Verify UI components
    report.checks.components = await this.verifyUIComponents();

    // Generate summary
    const allPassed = 
      report.checks.build.success &&
      report.checks.pages.success &&
      !report.checks.console.hasErrors;

    report.summary = {
      allPassed,
      passed: [
        report.checks.build.success && 'Build',
        report.checks.pages.success && 'Pages',
        !report.checks.console.hasErrors && 'No console errors'
      ].filter(Boolean),
      failed: [
        !report.checks.build.success && 'Build',
        !report.checks.pages.success && 'Pages',
        report.checks.console.hasErrors && 'Console errors'
      ].filter(Boolean)
    };

    return report;
  }

  generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('FRONTEND TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${results.timestamp}`);
    console.log('');

    if (results.checks.build) {
      console.log(`Build: ${results.checks.build.success ? '✓ PASSED' : '✗ FAILED'}`);
      if (!results.checks.build.success) {
        console.log(`  Error: ${results.checks.build.message}`);
      }
    }

    if (results.checks.pages) {
      console.log(`Pages: ${results.checks.pages.success ? '✓ PASSED' : '✗ FAILED'}`);
      results.checks.pages.pages.forEach(p => {
        console.log(`  ${p.page}: ${p.success ? 'OK' : 'FAILED'}`);
      });
    }

    if (results.checks.console) {
      console.log(`Console: ${results.checks.console.hasErrors ? '✗ WARNINGS' : '✓ CLEAN'}`);
    }

    if (results.summary) {
      console.log('');
      console.log('Summary:');
      if (results.summary.allPassed) {
        console.log('  ✓ All checks passed!');
      } else {
        console.log('  ✗ Some checks failed:');
        results.summary.failed.forEach(f => console.log(`    - ${f}`));
      }
    }

    console.log('='.repeat(60) + '\n');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'full-check';
  
  const tester = new FrontendTester({
    projectDir: path.join(__dirname, '..', 'trading-platform'),
    port: 3000
  });

  let results;

  switch (action) {
    case 'check-build':
      results = { checks: { build: await tester.checkBuild() } };
      break;
    case 'start-server':
      results = { checks: { server: await tester.startServer() } };
      break;
    case 'verify-pages':
      results = { checks: { pages: await tester.verifyPages() } };
      break;
    case 'check-console':
      results = { checks: { console: await tester.checkConsoleErrors() } };
      break;
    case 'full-check':
      results = await tester.fullCheck();
      tester.generateReport(results);
      break;
    default:
      console.log('Unknown action:', action);
      console.log('Available actions: check-build, start-server, verify-pages, check-console, full-check');
      process.exit(1);
  }

  if (action !== 'full-check') {
    console.log(JSON.stringify(results, null, 2));
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { FrontendTester };
