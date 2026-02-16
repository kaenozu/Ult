
import yahooFinance from 'yahoo-finance2';

async function verifyData() {
    const symbol = '7011.T'; // 三菱重工
    const queryOptions = {
        period1: '2026-02-10', // 2/10から
        period2: '2026-02-16', // 2/16まで
        interval: '1d' as const,
    };

    console.log(`Fetching data for ${symbol}...`);
    try {
        const result = await yahooFinance.chart(symbol, queryOptions);

        if (!result || !result.quotes) {
            console.error('No quotes found.');
            return;
        }

        console.log(`Found ${result.quotes.length} quotes.`);
        result.quotes.forEach((q: any) => {
            console.log(`Date: ${q.date.toISOString().split('T')[0]}, Close: ${q.close}, Volume: ${q.volume}`);
        });

        // Check specifically for 2026-02-13
        const hasFeb13 = result.quotes.some((q: any) => q.date.toISOString().startsWith('2026-02-13'));
        console.log(`\nHas data for 2026-02-13? ${hasFeb13 ? 'YES' : 'NO'}`);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

verifyData();
