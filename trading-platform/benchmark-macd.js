const { performance } = require('perf_hooks');

function _getValidPrice(p) {
  return p != null && typeof p === "number" && !isNaN(p) && p >= 0 ? p : NaN;
}

function calculateMACD_old(
  prices,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
) {
  const length = prices.length;
  const macd = new Array(length).fill(NaN);
  const signal = new Array(length).fill(NaN);
  const histogram = new Array(length).fill(NaN);

  const createEMAState = (period) => {
    let sum = 0;
    let count = 0;
    let prev = NaN;
    const k = 2 / (period + 1);

    return (val) => {
      if (isNaN(val)) {
        if (count >= period) prev = NaN;
        return NaN;
      }

      if (count < period) {
        sum += val;
        count++;
        if (count === period) {
          prev = sum / period;
          return prev;
        }
        return NaN;
      }

      if (!isNaN(prev)) {
        prev = (val - prev) * k + prev;
        return prev;
      }

      return NaN;
    };
  };

  const updateFast = createEMAState(fastPeriod);
  const updateSlow = createEMAState(slowPeriod);
  const updateSignal = createEMAState(signalPeriod);

  for (let i = 0; i < length; i++) {
    const price = _getValidPrice(prices[i]);

    const fastVal = updateFast(price);
    const slowVal = updateSlow(price);

    let macdVal = NaN;
    if (!isNaN(fastVal) && !isNaN(slowVal)) {
      macdVal = fastVal - slowVal;
      macd[i] = macdVal;
    }

    const signalVal = updateSignal(macdVal);
    signal[i] = signalVal;

    if (!isNaN(macdVal) && !isNaN(signalVal)) {
      histogram[i] = macdVal - signalVal;
    }
  }

  return { macd, signal, histogram };
}

function calculateMACD_new(
  prices,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
) {
  const length = prices.length;
  const macd = new Array(length);
  const signal = new Array(length);
  const histogram = new Array(length);

  let fastSum = 0, fastCount = 0, fastPrev = NaN;
  const fastK = 2 / (fastPeriod + 1);

  let slowSum = 0, slowCount = 0, slowPrev = NaN;
  const slowK = 2 / (slowPeriod + 1);

  let signalSum = 0, signalCount = 0, signalPrev = NaN;
  const signalK = 2 / (signalPeriod + 1);

  for (let i = 0; i < length; i++) {
    // Fast inline _getValidPrice logic
    const price = prices[i];
    const validPrice = (price === price && price >= 0) ? price : NaN;

    // Fast EMA
    let fastVal = NaN;
    if (validPrice !== validPrice) {
      if (fastCount >= fastPeriod) fastPrev = NaN;
    } else if (fastCount < fastPeriod) {
      fastSum += validPrice;
      fastCount++;
      if (fastCount === fastPeriod) {
        fastPrev = fastSum / fastPeriod;
        fastVal = fastPrev;
      }
    } else if (fastPrev === fastPrev) {
      fastPrev = (validPrice - fastPrev) * fastK + fastPrev;
      fastVal = fastPrev;
    }

    // Slow EMA
    let slowVal = NaN;
    if (validPrice !== validPrice) {
      if (slowCount >= slowPeriod) slowPrev = NaN;
    } else if (slowCount < slowPeriod) {
      slowSum += validPrice;
      slowCount++;
      if (slowCount === slowPeriod) {
        slowPrev = slowSum / slowPeriod;
        slowVal = slowPrev;
      }
    } else if (slowPrev === slowPrev) {
      slowPrev = (validPrice - slowPrev) * slowK + slowPrev;
      slowVal = slowPrev;
    }

    let macdVal = NaN;
    if (fastVal === fastVal && slowVal === slowVal) {
      macdVal = fastVal - slowVal;
    }
    macd[i] = macdVal;

    // Signal EMA
    let signalVal = NaN;
    if (macdVal !== macdVal) {
      if (signalCount >= signalPeriod) signalPrev = NaN;
    } else if (signalCount < signalPeriod) {
      signalSum += macdVal;
      signalCount++;
      if (signalCount === signalPeriod) {
        signalPrev = signalSum / signalPeriod;
        signalVal = signalPrev;
      }
    } else if (signalPrev === signalPrev) {
      signalPrev = (macdVal - signalPrev) * signalK + signalPrev;
      signalVal = signalPrev;
    }
    signal[i] = signalVal;

    if (macdVal === macdVal && signalVal === signalVal) {
      histogram[i] = macdVal - signalVal;
    } else {
      histogram[i] = NaN;
    }
  }

  return { macd, signal, histogram };
}


// Generate data
const data = Array.from({ length: 10000 }, () => Math.random() * 100 + 50);

// Warmup
for (let i = 0; i < 100; i++) {
  calculateMACD_old(data);
  calculateMACD_new(data);
}

// Measure
const t0 = performance.now();
for (let i = 0; i < 1000; i++) {
  calculateMACD_old(data);
}
const t1 = performance.now();

const t2 = performance.now();
for (let i = 0; i < 1000; i++) {
  calculateMACD_new(data);
}
const t3 = performance.now();

console.log(`Old MACD: ${(t1 - t0).toFixed(2)}ms`);
console.log(`New MACD: ${(t3 - t2).toFixed(2)}ms`);
console.log(`Improvement: ${(((t1 - t0) - (t3 - t2)) / (t1 - t0) * 100).toFixed(2)}%`);
