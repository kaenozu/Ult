
import { formatCurrency, formatNumber } from './app/lib/utils';

describe('Benchmark', () => {
    it('benchmarks formatCurrency and formatNumber', () => {
        const ITERATIONS = 100000;

        console.log(`Benchmarking with ${ITERATIONS} iterations...`);

        // Warmup
        formatCurrency(100, 'JPY');
        formatNumber(100, 2);

        const startCurrency = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
          formatCurrency(i, 'JPY');
          formatCurrency(i, 'USD');
        }
        const endCurrency = performance.now();
        console.log(`formatCurrency: ${(endCurrency - startCurrency).toFixed(2)}ms`);

        const startNumber = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
          formatNumber(i, 2);
        }
        const endNumber = performance.now();
        console.log(`formatNumber: ${(endNumber - startNumber).toFixed(2)}ms`);
    });
});
