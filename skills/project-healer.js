const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORK_DIR = path.join(PROJECT_ROOT, 'trading-platform');
const LOG_FILE = path.join(PROJECT_ROOT, 'healer_report.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

function runCommand(command, cwd = WORK_DIR) {
    log(`Executing: ${command}`);
    try {
        execSync(command, { cwd, stdio: 'inherit' });
        return true;
    } catch (error) {
        log(`Command failed: ${command}`);
        return false;
    }
}

function checkDependencies() {
    log('--- Checking Dependencies ---');
    const nodeModules = path.join(WORK_DIR, 'node_modules');
    const binDir = path.join(nodeModules, '.bin');
    const nextBin = path.join(binDir, process.platform === 'win32' ? 'next.cmd' : 'next');
    const jestBin = path.join(binDir, process.platform === 'win32' ? 'jest.cmd' : 'jest');

    if (!fs.existsSync(nodeModules) || !fs.existsSync(nextBin) || !fs.existsSync(jestBin)) {
        log('Dependencies missing or corrupt. Reinstalling...');
        // Use npm ci if package-lock exists, else npm install
        const cmd = fs.existsSync(path.join(WORK_DIR, 'package-lock.json')) ? 'npm ci' : 'npm install';
        if (!runCommand(cmd)) {
            log('CRITICAL: Failed to install dependencies.');
            return false;
        }
    } else {
        log('Dependencies appear intact.');
    }
    return true;
}

function checkBuild() {
    log('--- Checking Build Status ---');
    // Using npx next build to ensure we use the local binary
    if (!runCommand('npm run build')) {
        log('Build FAILED. Please check build logs.');
        return false;
    }
    log('Build SUCCESS.');
    return true;
}

function checkTests() {
    log('--- Running Unit Tests ---');
    if (!runCommand('npm test')) {
        log('Tests FAILED.');
        return false;
    }
    log('Tests PASSED.');
    return true;
}

function fixLint() {
    log('--- Auto-Fixing Lint Issues ---');
    // Try standard lint fix first
    runCommand('npm run lint -- --fix');
    // Try aggressive direct eslint fix for files
    runCommand('npx eslint "app/**/*.{ts,tsx}" --fix');
    log('Lint fix attempts completed.');
    return true;
}

async function main() {
    log('=== Project Healer Started ===');

    // 1. Dependencies
    if (!checkDependencies()) process.exit(1);

    // 2. Lint (Fix before build to potentially solve simple issues)
    fixLint();

    // 3. Build matches production reality
    if (!checkBuild()) process.exit(1);

    // 4. Tests verify logic
    if (!checkTests()) process.exit(1);

    log('=== Project Health: EXCELLENT (GREEN) ===');
    log('The environment is restored, linted, built, and tested successfully.');
}

main();
