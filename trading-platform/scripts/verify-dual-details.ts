
// Use relative paths to avoid alias issues in simple scripts
import { PerformanceScreenerService } from '../app/lib/PerformanceScreenerService';
import { JAPAN_STOCKS, fetchOHLCV } from '../app/data/stocks';

// Capture all logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => originalConsoleLog(`[LOG]`, ...args);
console.error = (...args) => originalConsoleError(`[ERR]`, ...args);
console.warn = (...args) => originalConsoleWarn(`[WRN]`, ...args);

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Target symbols to verify
const TARGETS = ['7013', '7011'];

async function run() {
    console.log('🔍 Verifying Dual Match Targets:', TARGETS.join(', '));

    // Filter JAPAN_STOCKS to only target symbols
    const targetStocks = JAPAN_STOCKS.filter(s => TARGETS.includes(s.symbol));

    if (targetStocks.length === 0) {
        console.error("Could not find target stocks in JAPAN_STOCKS definition.");
        return;
    }

    // Prepare data sources correctly using valid exports
    const dataSources = targetStocks.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        // Wrap fetchOHLCV to match expected interface
        fetchData: async (forceRefresh: boolean = false) => {
            console.log(`[Script] fetching data for ${stock.symbol} (force=${forceRefresh})...`);
            try {
                const data = await fetchOHLCV(stock.symbol, stock.market, stock.price, undefined, '1d', undefined, forceRefresh);
                console.log(`[Script] ${stock.symbol}: Fetched ${data.length} records.`);
                return data;
            } catch (e) {
                console.error(`[Script] Fetch error for ${stock.symbol}:`, e);
                throw e;
            }
        }
    }));

    const service = new PerformanceScreenerService();

    console.log('⏳ Running scanDual for target stocks...');
    try {
        // Pass dataSources as first argument!
        // minTrades: 0 to debug if that's the blocker
        const results = await service.scanDual(dataSources, {
            minConfidence: 0,
            minDualScore: 0,
            period: 180,
            minTrades: 0,
            lookbackDays: 90 // explicitly set lookback
        });

        console.log(`[Script] Scan complete. DualMatches: ${results.dualMatches.length}`);

        console.log('\n📊 Target Analysis:');

        // Check if they are in dualMatches
        if (results.dualMatches.length > 0) {
            results.dualMatches.forEach(t => {
                printAnalysis(t);
            });
        } else {
            console.log("No Dual Matches found. Checking individual logs if they were processed but filtered.");
            // If not in dualMatches, they might be in performance or aiSignals if they passed individual filters
            console.log("Performance Results:", results.performance.results.length);
            results.performance.results.forEach(p => console.log(` - ${p.symbol}: Score=${p.performanceScore}`));

            console.log("AI Results:", results.aiSignals.results.length);
            results.aiSignals.results.forEach(a => console.log(` - ${a.symbol}: ${a.signalType} ${a.confidence}%`));
        }

        console.log("\nDebug Logs:");
        results.debugLogs?.filter(l => TARGETS.some(t => l.includes(t))).forEach(l => console.log(l));

    } catch (error) {
        console.error("Scan failed:", error);
        console.error(error);
    }
}

function printAnalysis(t: any) {
    console.log(`\n============== ${t.name} (${t.symbol}) ==============`);
    console.log(`🏆 Dual Score: ${t.dualScore?.toFixed(2)}`);
    console.log(`-------------------------------------------`);
    console.log(`1. Performance (Weight: x300)`);
    console.log(`   - Win Rate: ${(t.performance.winRate).toFixed(1)}%`);
    console.log(`   - Profit Factor: ${t.performance.profitFactor.toFixed(2)}`);
    console.log(`   - Sharpe Ratio: ${t.performance.sharpeRatio.toFixed(2)}`);
    console.log(`   - Total Trades: ${t.performance.totalTrades}`);
    console.log(`   - Perf Score: ${t.performance.performanceScore}`);
    console.log(`2. AI Signal (Weight: x200)`);
    console.log(`   - Type: ${t.aiSignal.signalType}`);
    console.log(`   - Confidence: ${(t.aiSignal.confidence).toFixed(1)}%`);
    console.log(`   - Predicted Change: ${(t.aiSignal.predictedChange || 0).toFixed(2)}%`);
    console.log(`-------------------------------------------`);
}

run().then(() => {
    console.log("Script finished. Waiting for flush...");
    console.log("Script finished. Waiting for flush...");
    setTimeout(() => process.exit(0), 10000);
}).catch(console.error);
