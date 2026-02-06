
import yahooFinance from 'yahoo-finance2';

async function main() {
    try {
        const symbol = '7203.T';
        const result = await yahooFinance.chart(symbol, { period1: '2023-01-01', interval: '1d' });
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

main();
