
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function main() {
    try {
        const symbol = '7974.T';
        console.log(`Fetching ${symbol} via yahoo-finance2...`);
        const quote = await yahooFinance.quote(symbol);
        console.log('--- CLEAN RESULT ---');
        console.log(`Symbol: ${quote.symbol}`);
        console.log(`Price: ${quote.regularMarketPrice}`);
        console.log(`Currency: ${quote.currency}`);
        console.log(`MarketState: ${quote.marketState}`);
        console.log(`ShortName: ${quote.shortName}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
