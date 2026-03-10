const { performance } = require('perf_hooks');

function calculateRSI_old(prices, period = 14) {
  const length = prices.length;
  const result = new Array(length).fill(NaN);
  if (length <= period) return result;

  const floatPrices = new Float64Array(prices);
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = floatPrices[i] - floatPrices[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const rsInitial = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - (100 / (1 + rsInitial));

  for (let i = period + 1; i < length; i++) {
    const change = floatPrices[i] - floatPrices[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - (100 / (1 + rs));
  }
  return result;
}

function calculateRSI_new(prices, period = 14) {
  const length = prices.length;
  const result = new Array(length);
  // Manual initialization avoiding .fill(NaN)
  for (let i = 0; i < period; i++) {
    result[i] = NaN;
  }
  if (length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change; // Equivalent to Math.abs(change) when change < 0
  }

  const invPeriod = 1 / period;
  const periodMinus1 = period - 1;

  avgGain *= invPeriod;
  avgLoss *= invPeriod;

  const rsInitial = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - (100 / (1 + rsInitial));

  for (let i = period + 1; i < length; i++) {
    const change = prices[i] - prices[i - 1];
    let gain = 0;
    let loss = 0;

    if (change >= 0) {
      gain = change;
    } else {
      loss = -change; // Avoid Math.abs
    }

    avgGain = (avgGain * periodMinus1 + gain) * invPeriod;
    avgLoss = (avgLoss * periodMinus1 + loss) * invPeriod;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - (100 / (1 + rs));
  }

  return result;
}

// Generate data
const data = Array.from({ length: 100000 }, () => Math.random() * 100 + 50);

// Warmup
for (let i = 0; i < 100; i++) {
  calculateRSI_old(data);
  calculateRSI_new(data);
}

// Measure
const t0 = performance.now();
for (let i = 0; i < 1000; i++) {
  calculateRSI_old(data);
}
const t1 = performance.now();

const t2 = performance.now();
for (let i = 0; i < 1000; i++) {
  calculateRSI_new(data);
}
const t3 = performance.now();

console.log(`Old: ${(t1 - t0).toFixed(2)}ms`);
console.log(`New: ${(t3 - t2).toFixed(2)}ms`);
console.log(`Improvement: ${(((t1 - t0) - (t3 - t2)) / (t1 - t0) * 100).toFixed(2)}%`);
