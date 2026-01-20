#!/usr/bin/env node

/**
 * Script to replace remaining console statements with winston logger
 */

import fs from 'fs';
import path from 'path';

// Replacement patterns for console statements
const REPLACEMENTS = [
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
  },
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
  },
];

// Files to update (exclude tests and config files)
const TARGET_EXTENSIONS = ['.ts', '.tsx'];
const SKIP_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /node_modules/,
  /dist/,
  /\.config\./,
];

function shouldSkipFile(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { updated: false, reason: 'skipped' };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let changesMade = false;

    // Add logger import if not present and console statements exist
    const hasConsoleStatements = REPLACEMENTS.some(({ pattern }) =>
      pattern.test(content)
    );

    if (hasConsoleStatements) {
      // Add winston import if not already present
      if (
        !content.includes('import logger') &&
        !content.includes("from '../lib/logger'")
      ) {
        const importStatement = "import logger from '@/lib/logger';";

        if (content.startsWith('import')) {
          // Add to existing imports
          updatedContent = importStatement + '\n' + updatedContent;
        } else {
          // Add at the beginning
          updatedContent = importStatement + '\n\n' + updatedContent;
        }
        changesMade = true;
      }

      // Replace console statements
      REPLACEMENTS.forEach(({ pattern, replacement }) => {
        if (pattern.test(updatedContent)) {
          updatedContent = updatedContent.replace(pattern, replacement);
          changesMade = true;
        }
      });
    }

    if (changesMade && content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      return { updated: true };
    }

    return { updated: false };
  } catch (error) {
    return { updated: false, reason: error.message };
  }
}

function findFiles(dir) {
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
      } else if (TARGET_EXTENSIONS.some(ext => item.endsWith(ext))) {
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

  console.log('🔄 Replacing console statements with winston logger...');

  const files = findFiles(srcDir);
  let totalUpdated = 0;

  for (const file of files) {
    const result = processFile(file);

    if (result.updated) {
      totalUpdated++;
      console.log(`✅ Updated: ${file}`);
    } else if (result.reason && result.reason !== 'skipped') {
      console.log(`❌ Error: ${file} - ${result.reason}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files updated: ${totalUpdated}`);

  if (totalUpdated > 0) {
    console.log('\n✨ Console statements replaced with winston logger!');
  } else {
    console.log('\n✅ No console statements found to replace');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
