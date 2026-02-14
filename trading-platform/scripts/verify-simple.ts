
// Simplified verification script for 7013 only
import { PerformanceScreenerService } from '../app/lib/PerformanceScreenerService';
import { fetchOHLCV } from '../app/data/stocks';

async function run() {
    console.log('🔍 Simple Verification for 7013 (IHI)');

    const stock = { symbol: '7013', name: 'IHI', market: 'japan' as const };

    const dataSource = {
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        fetchData: async () => {
            try {
                console.log("Fetching data...");
                const data = await fetchOHLCV(stock.symbol, stock.market, undefined, undefined, '1d', undefined, false);
                console.log(`Fetched ${data.length} records.`);
                return data;
            } catch (e) {
                console.error("Fetch error:", e);
                return [];
            }
        }
    };

    const service = new PerformanceScreenerService();

    console.log('⏳ Running scanDual...');
    try {
        const results = await service.scanDual([dataSource], {
            minConfidence: 0,
            minDualScore: 0,
            period: 180,
            minTrades: 0,
            lookbackDays: 90
        });

        console.log(`Scan complete. DualMatches: ${results.dualMatches.length}`);

        if (results.dualMatches.length > 0) {
            const t = results.dualMatches[0];
            console.log(`\n============== ${t.name} (${t.symbol}) ==============`);
            console.log(`🏆 Dual Score: ${t.dualScore?.toFixed(2)}`);
            console.log(`   - Win Rate: ${(t.performance.winRate).toFixed(1)}%`);
            console.log(`   - AI Confidence: ${(t.aiSignal.confidence).toFixed(1)}%`);
            console.log(`   - Signal: ${t.aiSignal.signalType}`);
        } else {
            console.log("No match found.");
            console.log("Logs:", results.debugLogs);
        }

    } catch (error) {
        console.error("Scan failed:", error);
    }
}

run();
