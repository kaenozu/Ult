const fs = require('fs');
const path = 'trading-platform/app/lib/strategy-optimization-example.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// First replacement: buyAndHold block (keep const line 116, replace lines 117-121)
const newBuyBlock = [
  "    console.log(",
  "      'Buy & Hold'.padEnd(30) +",
  "      `${buyAndHoldResult.metrics.totalReturn.toFixed(2)}%`.padEnd(15) +",
  "      buyAndHoldResult.metrics.sharpeRatio.toFixed(2).padEnd(10) +",
  "      `${buyAndHoldResult.metrics.maxDrawdown.toFixed(2)}%`",
  "    );"
];

// Replace lines 117-121 (indices 116-120) with newBuyBlock
lines = lines.slice(0, 116).concat(newBuyBlock, lines.slice(121));

// Second replacement: forEach block (original lines 107-113 -> indices 106-112)
const newForEachBlock = [
  "  results.forEach(({ name, result }) => {",
  "    console.log(",
  "      name.padEnd(30) +",
  "      `${result.metrics.totalReturn.toFixed(2)}%`.padEnd(15) +",
  "      result.metrics.sharpeRatio.toFixed(2).padEnd(10) +",
  "      `${result.metrics.maxDrawdown.toFixed(2)}%`",
  "    );",
  "  });"
];

lines = lines.slice(0, 106).concat(newForEachBlock, lines.slice(113));

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixed strategy-optimization-example.ts');
