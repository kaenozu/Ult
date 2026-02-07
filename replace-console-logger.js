#!/usr/bin/env node
/**
 * Script to replace console.log/warn/error/info/debug with logger in TypeScript files
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  { pattern: /console\.debug\(/g, replacement: 'logger.debug(' },
  { pattern: /console\.log\(/g, replacement: 'logger.info(' },
  { pattern: /console\.info\(/g, replacement: 'logger.info(' },
  { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
  { pattern: /console\.error\(/g, replacement: 'logger.error(' },
];

function hasLoggerImport(content) {
  // Check for various logger import patterns including aliases
  const patterns = [
    // Core logger imports
    /import\s+\{[^}]*logger[^}]*\}\s+from\s+['"]@\/app\/core\/logger['"]/,
    /import\s+\{[^}]*logger[^}]*\}\s+from\s+['"]@\/app\/lib\/logger['"]/,
    /import\s+\{[^}]*logger[^}]*\}\s+from\s+['"]\.\.\/core\/logger['"]/,
    /import\s+\{[^}]*logger[^}]*\}\s+from\s+['"]\.\.\/logger['"]/,
    /import\s+\{[^}]*logger[^}]*\}\s+from\s+['"]\.\.\/\.\.\/core\/logger['"]/,
    /import\s+\{[^}]*logger[^}]*\}\s+from\s+['"]\.\.\/\.\.\/lib\/logger['"]/,
    // Aliased imports
    /import\s+\{\s*logger\s+as\s+\w+\s*\}\s+from\s+['"]@\/app\/(core|lib)\/logger['"]/,
    /import\s+\{\s*\w+\s+as\s+logger\s*\}\s+from\s+['"]@\/app\/(core|lib)\/logger['"]/,
    // Default imports
    /import\s+logger\s+from\s+['"]@\/app\/(core|lib)\/logger['"]/,
    // Dynamic imports
    /import\s*\(\s*['"]@\/app\/(core|lib)\/logger['"]\s*\)/,
  ];

  return patterns.some(pattern => pattern.test(content));
}

function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content;
  }

  const lines = content.split('\n');
  let insertIndex = 0;
  let inImportBlock = false;
  
  // Find where to insert the logger import
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we're in an import block
    if (line.startsWith('import')) {
      inImportBlock = true;
    } else if (inImportBlock && (line.startsWith('export') || line.startsWith('class') || line.startsWith('function') || line.startsWith('const') || line.startsWith('let') || line.startsWith('interface'))) {
      // We've reached the end of imports
      insertIndex = i;
      break;
    }
  }

  const importLine = "import { logger } from '@/app/core/logger';";
  lines.splice(insertIndex, 0, importLine);

  return lines.join('\n');
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let modified = false;

    for (const { pattern, replacement } of replacements) {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, replacement);
        modified = true;
      }
    }

    if (modified) {
      const withImport = addLoggerImport(newContent, filePath);
      fs.writeFileSync(filePath, withImport, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    console.log('No files provided');
    return;
  }

  let processedCount = 0;
  let fileCount = 0;

  for (const file of files) {
    const fullPath = path.resolve(file);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      fileCount++;
      if (processFile(fullPath)) {
        processedCount++;
        console.log(`✓ Processed: ${file}`);
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Files processed: ${fileCount}`);
  console.log(`  Files modified: ${processedCount}`);
}

main();
