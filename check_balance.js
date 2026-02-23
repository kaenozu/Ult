const fs = require('fs');
const content = fs.readFileSync('trading-platform/app/lib/__tests__/ai-prediction-backtest-real.test.ts', 'utf8');
let braceCount = 0;
let parenCount = 0;
for (const char of content) {
  if (char === '{') braceCount++;
  if (char === '}') braceCount--;
  if (char === '(') parenCount++;
  if (char === ')') parenCount--;
}
console.log(`Braces: ${braceCount}, Parens: ${parenCount}`);
