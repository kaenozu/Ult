
const YahooFinance = require('yahoo-finance2').default;

const yf = new YahooFinance();

async function main() {
    try {
        const symbol = '7203.T';
        console.log(`Fetching data for ${symbol}...`);
        // Suppress notices if possible or just ignore them
        const result = await yf.chart(symbol, { period1: '2023-01-01', interval: '1d' });
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error fetching data:', error);
        if (error.errors) {
            console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }
    }
}

main();
