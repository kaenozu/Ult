
import yf from 'yahoo-finance2';

async function main() {
    const symbol = '6098.T';
    try {
        console.log(`Fetching quote for ${symbol}...`);
        const quote = await yf.quote(symbol);
        console.log('--- RAW QUOTE START ---');
        console.log(JSON.stringify(quote, null, 2));
        console.log('--- RAW QUOTE END ---');
    } catch (error) {
        console.error('Error fetching quote:', error);
    }
}

main();
