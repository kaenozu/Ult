#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Replace logger.error/warn/info calls with unknown error type
    // Pattern 1: Single quotes - logger.error('message', error)
    const pattern1 = /logger\.(error|warn|info|debug)\('([^']*)',\s*error\)/g;
    // Pattern 2: Double quotes - logger.error("message", error)
    const pattern1b = /logger\.(error|warn|info|debug)\("([^"]*)",\s*error\)/g;
    // Pattern 3: Single quotes with context - logger.error('message', {context} | error)
    const pattern2 = /logger\.(error|warn|info|debug)\('([^']*)',\s*(\{[^}]*\})\s*\|\s*error\)/g;
    // Pattern 4: Double quotes with context - logger.error("message", {context} | error)
    const pattern2b = /logger\.(error|warn|info|debug)\("([^"]*)",\s*(\{[^}]*\})\s*\|\s*error\)/g;
    // Pattern 5: Single quotes with nested context - logger.error('message', {context: {nested}} | error)
    const pattern3 = /logger\.(error|warn|info|debug)\('([^']*)',\s*(\{[^}]*\{[^}]*\}[^}]*\})\s*\|\s*error\)/g;
    // Pattern 6: Double quotes with nested context - logger.error("message", {context: {nested}} | error)
    const pattern3b = /logger\.(error|warn|info|debug)\("([^"]*)",\s*(\{[^}]*\{[^}]*\}[^}]*\})\s*\|\s*error\)/g;

    let newContent = content.replace(pattern1, (match, method, message) => {
      return `logger.${method}('${message}', error instanceof Error ? error : new Error(String(error)))`;
    });

    newContent = newContent.replace(pattern1b, (match, method, message) => {
      return `logger.${method}("${message}", error instanceof Error ? error : new Error(String(error)))`;
    });

    newContent = newContent.replace(pattern2, (match, method, message, context) => {
      return `logger.${method}('${message}', ${context} | error instanceof Error ? error : new Error(String(error)))`;
    });

    newContent = newContent.replace(pattern2b, (match, method, message, context) => {
      return `logger.${method}("${message}", ${context} | error instanceof Error ? error : new Error(String(error)))`;
    });

    newContent = newContent.replace(pattern3, (match, method, message, context) => {
      return `logger.${method}('${message}', ${context} | error instanceof Error ? error : new Error(String(error)))`;
    });

    newContent = newContent.replace(pattern3b, (match, method, message, context) => {
      return `logger.${method}("${message}", ${context} | error instanceof Error ? error : new Error(String(error)))`;
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
