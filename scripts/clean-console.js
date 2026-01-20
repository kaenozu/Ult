#!/usr/bin/env node

/**
 * Script to remove console statements from production code
 * Replaces console.log, console.error, console.warn, console.info, console.debug
 * with proper logging statements or removes them entirely
 */

import fs from 'fs';
import path from 'path';

// Files to skip (test files, config files, etc.)
const SKIP_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /node_modules/,
  /dist/,
  /\.config\./,
  /webpack/,
  /babel/,
];

// Console patterns to replace
const CONSOLE_PATTERNS = [
  /\s*console\.log\([^)]*\);?\s*/g,
  /\s*console\.error\([^)]*\);?\s*/g,
  /\s*console\.warn\([^)]*\);?\s*/g,
  /\s*console\.info\([^)]*\);?\s*/g,
  /\s*console\.debug\([^)]*\);?\s*/g,
];

function shouldSkipFile(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function cleanFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { cleaned: false, reason: 'skipped' };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let cleanedContent = content;
    let removedCount = 0;

    // Remove console statements
    CONSOLE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        removedCount += matches.length;
      }
      cleanedContent = cleanedContent.replace(pattern, '');
    });

    // Only write if content changed
    if (content !== cleanedContent) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      return { cleaned: true, removedCount };
    }

    return { cleaned: false, removedCount: 0 };
  } catch (error) {
    return { cleaned: false, reason: error.message };
  }
}

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!shouldSkipFile(fullPath)) {
          traverse(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function main() {
  const srcDir = path.join(process.cwd(), 'src');

  if (!fs.existsSync(srcDir)) {
    console.error('src directory not found');
    process.exit(1);
  }

  console.log('🧹 Cleaning console statements from production code...');

  const files = findFiles(srcDir);
  let totalRemoved = 0;
  let totalCleaned = 0;

  for (const file of files) {
    const result = cleanFile(file);

    if (result.cleaned) {
      totalCleaned++;
      totalRemoved += result.removedCount;
      console.log(
        `✅ Cleaned: ${file} (${result.removedCount} console statements removed)`
      );
    } else if (result.reason && result.reason !== 'skipped') {
      console.log(`❌ Error: ${file} - ${result.reason}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files cleaned: ${totalCleaned}`);
  console.log(`   Console statements removed: ${totalRemoved}`);

  if (totalRemoved > 0) {
    console.log('\n✨ Production code cleaned successfully!');
  } else {
    console.log('\n✅ No console statements found in production code');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanFile, findFiles };
