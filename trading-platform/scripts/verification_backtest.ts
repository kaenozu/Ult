
import { accuracyService } from '../app/lib/AccuracyService';
import { OHLCV } from '../app/types';

// Self-contained generator to avoid import issues
function generateMockOHLCV(startPrice: number, count: number): OHLCV[] {
    const data: OHLCV[] = [];
    let currentPrice = startPrice;
    const volatility = 0.02;

    const startDate = new Date('2024-01-01');

    for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        const change = (Math.random() - 0.5) * volatility * currentPrice;
        currentPrice += change;

        const open = currentPrice;
        const high = open * (1 + Math.random() * 0.01);
        const low = open * (1 - Math.random() * 0.01);
        const close = low + Math.random() * (high - low);
        const volume = Math.floor(Math.random() * 1000000);

        data.push({
            date: date.toISOString().split('T')[0],
            open, high, low, close, volume
        });
    }
    return data;
}

async function verify() {
    console.log('Starting Backtest Verification (Self-Contained)...');

    // Generate 300 days of data
    const data = generateMockOHLCV(3000, 300);

    // Run backtest
    console.log(`Running backtest with ${data.length} days of data...`);
    try {
        const result = accuracyService.runBacktest('TEST', data, 'japan');

        console.log('--- Result ---');
        console.log('Total Trades:', result.totalTrades);
        console.log('Win Rate:', result.winRate + '%');
        console.log('Total Return:', result.totalReturn + '%');

        if (result.totalTrades > 0) {
            if (result.winRate < 100) {
                console.log('VERIFICATION PASSED: Trades generated and Win Rate is realistic (<100%)');
            } else {
                console.log('VERIFICATION WARNING: Win Rate is 100%. Check if look-ahead bias persists.');
            }
        } else {
            console.log('VERIFICATION FAILED: No trades generated (0 trades).');
        }

    } catch (err) {
        console.error('Execution Error:', err);
    }
}

verify().catch(console.error);
