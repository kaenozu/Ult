#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Replace console.error/warn/info/debug with logger - handle unknown error type
    // Pattern 1: catch (error) { logger.error('message', error); }
    // Replace with: catch (error) { logger.error('message', error instanceof Error ? error : new Error(String(error))); }
    const pattern = /(catch\s*\(\s*error\s*\)\s*\{\s*logger\.(error|warn|info|debug)\('([^']*)',\s*)error\s*\);/g;

    let newContent = content.replace(pattern, (match, method, message, spaces) => {
      return `catch (error) { logger.${method}('${message}',${spaces} error instanceof Error ? error : new Error(String(error)));`;
    });

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

const files = process.argv.slice(2);
let processedCount = 0;

for (const file of files) {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    if (processFile(fullPath)) {
      processedCount++;
      console.log(`✓ Processed: ${file}`);
    }
  }
}

console.log(`\nSummary:`);
console.log(`  Files modified: ${processedCount}`);
