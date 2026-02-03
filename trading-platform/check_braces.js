const fs = require('fs');
const filepath = '/c/gemini-desktop/Ult/trading-platform/app/components/StockChart/StockChart.tsx';
const content = fs.readFileSync(filepath, 'utf8');

let inSingle = false, inDouble = false, inTemplate = false;
let inLineComment = false, inBlockComment = false;
let braceDepth = 0;
let firstNeg = null;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i+1] || '';

  // Comments
  if (inBlockComment) {
    if (c === '*' && next === '/') { inBlockComment = false; i++; }
    continue;
  }
  if (inLineComment) {
    if (c === '\n') inLineComment = false;
    continue;
  }
  if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
  if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }

  // Strings
  if (inTemplate) { if (c === '`') inTemplate = false; continue; }
  if (inSingle) { if (c === "'") inSingle = false; continue; }
  if (inDouble) { if (c === '"') inDouble = false; continue; }
  if (c === '`') { inTemplate = true; continue; }
  if (c === "'") { inSingle = true; continue; }
  if (c === '"') { inDouble = true; continue; }

  // Braces
  if (c === '{') {
    braceDepth++;
  } else if (c === '}') {
    braceDepth--;
    if (braceDepth < 0 && firstNeg === null) {
      const lines = content.substring(0, i).split('\n');
      const lineNum = lines.length;
      firstNeg = { line: lineNum };
    }
  }
}

console.log(`Final brace depth: ${braceDepth}`);
if (firstNeg) {
  console.log(`First negative depth at line ${firstNeg.line}`);
} else if (braceDepth !== 0) {
  console.log(`Brace depth ends at ${braceDepth}`);
} else {
  console.log('Braces balanced.');
}
