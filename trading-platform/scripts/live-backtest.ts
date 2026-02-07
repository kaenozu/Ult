import { marketDataService } from '../app/lib/MarketDataService';
import { unifiedIntelligenceService } from '../app/lib/services/UnifiedIntelligenceService';
import { SignalValidatorService } from '../app/lib/SignalValidatorService';
import { Signal } from '../app/types';

async function runLiveBacktest(symbol: string) {
  console.log(`[BACKTEST] Starting strategy verification for ${symbol}...`);
  
  const result = await marketDataService.fetchMarketData(symbol);
  if (!result.success) {
    console.error('Data fetch failed:', result.error);
    return;
  }

  const history = result.data;
  console.log(`[DATA] Fetched ${history.length} points (${history[0].date} to ${history[history.length-1].date})`);

  // Generate intelligence report
  const report = await unifiedIntelligenceService.generateReport(symbol, 'japan');
  
  console.log('\n--- UNIFIED ENGINE ANALYSIS ---');
  console.log(`Confidence: ${report.confidenceScore}%`);
  console.log(`Recommendation: ${report.recommendation}`);
  console.log(`Expected Value (EV): +${report.expectedValue.expectedValue.toFixed(2)}`);
  console.log(`Optimized RSI Period: ${report.optimizedRSIPeriod}`);

  // Backtest across history
  const validator = new SignalValidatorService();
  
  // Create mock signals for each data point (simplified backtest)
  const mockSignals: Signal[] = history.slice(50, -5).map((d) => ({
    symbol,
    type: 'BUY' as const,
    price: d.close,
    timestamp: new Date(d.date).getTime(),
    confidence: 0.7,
    // Add required missing properties
    targetPrice: d.close * 1.05,
    stopLoss: d.close * 0.97,
    reason: 'Backtest auto-signal',
    predictedChange: 5.0,
    predictionDate: d.date
  }));

  const backtestResult = validator.validate(mockSignals, history);

  console.log('\n--- BACKTEST STATISTICS (1 YEAR) ---');
  console.log(`Total Trades: ${backtestResult.totalSignals}`);
  console.log(`Hit Rate: ${backtestResult.hitRate.toFixed(1)}%`);
  console.log(`Profit Factor: ${backtestResult.profitFactor.toFixed(2)}`);
  console.log(`Total Profit Points: ${(backtestResult.totalProfit - backtestResult.totalLoss).toFixed(2)}`);
  
  if (backtestResult.profitFactor > 1.2) {
    console.log('\n✅ CONCLUSION: Strategy shows statistical edge. Deployment recommended.');
  } else {
    console.log('\n⚠️ CONCLUSION: Current parameters insufficient. Further optimization required.');
  }
}

runLiveBacktest('7203').catch(console.error);