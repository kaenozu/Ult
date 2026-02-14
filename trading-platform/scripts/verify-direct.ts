
// Direct verification script that bypasses service batch logic
import { PerformanceScreenerService } from '../app/lib/PerformanceScreenerService';
import { fetchOHLCV } from '../app/data/stocks';
import { mlPredictionService } from '../app/lib/mlPrediction';
import { consensusSignalService } from '../app/lib/ConsensusSignalService';

async function run() {
    console.log('🔍 Direct Verification for 7011 (Mitsubishi Heavy Industries)');

    const stock = { symbol: '7011', name: 'MHI', market: 'japan' as const, price: 0, change: 0, changePercent: 0, volume: 0 };

    try {
        // 1. Fetch Data
        console.log("Fetching data...");
        const data = await fetchOHLCV(stock.symbol, stock.market, undefined, undefined, '1d', undefined, false);
        console.log(`Fetched ${data.length} records.`);

        if (data.length < 50) {
            console.error("Insufficient data");
            return;
        }

        const recentData = data.slice(-90); // 90 days lookback
        const currentPrice = recentData[recentData.length - 1].close;
        stock.price = currentPrice;

        // 2. Performance Score
        // Access private method via prototype or allow standard backtest?
        // We can't access private methods easily in TS without casting to any.
        const service = new PerformanceScreenerService();
        const backtestResult = await (service as any).runFastBacktest(stock.symbol, recentData, stock.market);
        const pScore = (service as any).calculatePerformanceScore(backtestResult);

        console.log(`\n📊 Performance Analysis (Score: ${pScore.toFixed(1)})`);
        console.log(`   - Win Rate: ${(backtestResult.winRate * 100).toFixed(1)}%`);
        console.log(`   - Profit Factor: ${backtestResult.profitFactor.toFixed(2)}`);
        console.log(`   - Total Trades: ${backtestResult.totalTrades}`);

        // 3. AI Signal
        const consensus = consensusSignalService.generateConsensus(recentData);
        const indicators = mlPredictionService.calculateIndicators(recentData);
        const mlPred = await mlPredictionService.predictAsync(stock, recentData, indicators);
        const mlSignal = mlPredictionService.generateSignal(stock, recentData, mlPred, indicators);

        let finalType = consensus.type;
        let finalConfidence = consensus.confidence;

        if (mlSignal.type === consensus.type) {
            finalConfidence = Math.min(finalConfidence + 10, 98);
        } else if (mlSignal.type !== 'HOLD' && consensus.type === 'HOLD') {
            finalType = mlSignal.type;
            finalConfidence = Math.max(mlSignal.confidence * 0.8, 40);
        }

        console.log(`\n🧠 AI Analysis`);
        console.log(`   - Type: ${finalType}`);
        console.log(`   - Confidence: ${finalConfidence.toFixed(1)}%`);
        console.log(`   - ML Signal: ${mlSignal.type} (${mlSignal.confidence.toFixed(1)}%)`);
        console.log(`   - Consensus: ${consensus.type} (${consensus.confidence.toFixed(1)}%)`);

        // 4. Dual Score
        const DUAL_SCORE_WEIGHT_PERF = 0.5;
        const DUAL_SCORE_WEIGHT_AI = 0.5;
        const DUAL_SCORE_BONUS_BUY = 10;
        const DUAL_SCORE_BONUS_SELL = 5;

        const buyBonus = finalType === 'BUY' ? DUAL_SCORE_BONUS_BUY : (finalType === 'SELL' ? DUAL_SCORE_BONUS_SELL : 0);
        const dualScore = (pScore * 300) + (finalConfidence * 200) + (finalType === 'BUY' ? 50 : 0); // Using the formula from skill/code
        // Note: The code actually uses: (pScore * 0.5) + (finalConfidence * 0.5) + bonus in recent version?
        // Let's check the service code again.
        // Line 384: const dualScore = (pScoreValue * DUAL_SCORE_WEIGHT_PERF) + (finalConfidence * DUAL_SCORE_WEIGHT_AI) + buyBonus;
        // And CONSTANTS: WEIGHT_PERF = 0.5, WEIGHT_AI = 0.5, BONUS_BUY = 10.

        // Wait, the skill says: (Performance Score * 300) + (AI Confidence * 200)...
        // The code says: (pScore * 0.5) + (conf * 0.5) + 10.
        // There is a discrepancy between the SKILL and the CODE. 
        // I will verify what the code actually does.

        const codeDualScore = (pScore * 0.5) + (finalConfidence * 0.5) + buyBonus;

        console.log(`\n🏆 Dual Score Calculation`);
        console.log(`   - Code Logic: ${codeDualScore.toFixed(2)}`);
        // console.log(`   - Skill Logic: ...`);

    } catch (error) {
        console.error("Analysis failed:", error);
    }
}

run();
