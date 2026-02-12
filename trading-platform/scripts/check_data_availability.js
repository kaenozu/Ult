const yahooFinance = require('yahoo-finance2').default;
const yahoo = new yahooFinance(); // Instantiate the class

async function checkStock(symbol) {
    const lookbackDays = 180; // Standard UI setting
    const buffer = 1000; // Test larger buffer
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (lookbackDays + buffer));
    const period1 = startDate.toISOString().split('T')[0];

    console.log(`Checking ${symbol} from ${period1}...`);
    try {
        const result = await yahoo.chart(symbol, { period1, interval: '1d' });
        const quotes = result.quotes;
        console.log(`  - Count: ${quotes ? quotes.length : 0}`);
        if (quotes && quotes.length > 0) {
            console.log(`  - First: ${new Date(quotes[0].date).toISOString().split('T')[0]}`);
            console.log(`  - Last: ${new Date(quotes[quotes.length - 1].date).toISOString().split('T')[0]}`);
        } else {
            console.log('  - No quotes returned.');
        }
    } catch (e) {
        console.error(`  - Error: ${e.message}`);
    }
}

(async () => {
    console.log('--- Data Availability Check ---');
    await checkStock('7011.T'); // Mitsubishi HI
    await checkStock('7203.T'); // Toyota
    await checkStock('9984.T'); // Softbank Group
    await checkStock('6758.T'); // Sony Group
})();
