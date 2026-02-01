/**
 * Example Usage of Alternative Data Integration
 * 
 * このファイルは代替データ統合機能の使用例を示します。
 * This file demonstrates how to use the alternative data integration features.
 */

import { 
  getGlobalEnhancedSentimentService,
  getGlobalDataCollector 
} from '@/app/lib/alternativeData';

/**
 * Example 1: Basic Sentiment Analysis
 * 基本的なセンチメント分析
 */
export async function basicSentimentAnalysis(symbol: string): Promise<void> {
  console.log('=== Basic Sentiment Analysis Example ===');
  
  // Get the global service instance
  const service = getGlobalEnhancedSentimentService();
  
  // Start the service (if not already started)
  try {
    service.start();
  } catch (error) {
    // Service might already be running
    console.log('Service already running');
  }
  
  // Analyze sentiment for a symbol
  const result = await service.analyzeSymbol(symbol);
  
  console.log(`\nAnalysis for ${symbol}:`);
  console.log(`Overall Sentiment Score: ${result.overallSentiment.overallScore.toFixed(2)}`);
  console.log(`Recommended Action: ${result.recommendedAction}`);
  console.log(`Action Confidence: ${(result.actionConfidence * 100).toFixed(1)}%`);
  console.log(`\nInvestor Sentiment:`);
  console.log(`  - Institutional: ${result.investorSentiment.institutional.toFixed(2)}`);
  console.log(`  - Retail: ${result.investorSentiment.retail.toFixed(2)}`);
  console.log(`  - Divergence: ${(result.investorSentiment.divergence * 100).toFixed(1)}%`);
}

/**
 * Example 2: Leading Indicators Analysis
 * 先行指標分析
 */
export async function leadingIndicatorsAnalysis(symbol: string): Promise<void> {
  console.log('\n=== Leading Indicators Analysis Example ===');
  
  const service = getGlobalEnhancedSentimentService();
  const result = await service.analyzeSymbol(symbol);
  
  const indicators = result.leadingIndicators;
  
  console.log(`\nLeading Indicators for ${symbol}:`);
  console.log(`  - Volume Anomaly: ${(indicators.volumeAnomaly * 100).toFixed(1)}%`);
  console.log(`  - Trend Acceleration: ${indicators.trendAcceleration.toFixed(3)}`);
  console.log(`  - Cross-Asset Sentiment: ${indicators.crossAssetSentiment.toFixed(2)}`);
  console.log(`  - Early Signal Strength: ${(indicators.earlySignalStrength * 100).toFixed(1)}%`);
  
  // Interpretation
  if (indicators.earlySignalStrength > 0.7) {
    console.log('\n⚠️  Strong early signal detected! Consider taking action.');
  } else if (indicators.earlySignalStrength > 0.4) {
    console.log('\n📊 Moderate signal detected. Monitor closely.');
  } else {
    console.log('\n✅ Normal market conditions.');
  }
}

/**
 * Example 3: Market Context Analysis
 * 市場コンテキスト分析
 */
export async function marketContextAnalysis(symbol: string): Promise<void> {
  console.log('\n=== Market Context Analysis Example ===');
  
  const service = getGlobalEnhancedSentimentService();
  const result = await service.analyzeSymbol(symbol);
  
  const context = result.marketContext;
  
  console.log(`\nMarket Context for ${symbol}:`);
  console.log(`  - Volatility: ${(context.volatility * 100).toFixed(1)}%`);
  console.log(`  - Momentum: ${context.momentum.toFixed(3)}`);
  console.log(`  - Regime: ${context.regime}`);
  
  // Strategy recommendation based on regime
  switch (context.regime) {
    case 'TRENDING':
      console.log('\n📈 Trending market: Consider trend-following strategies');
      break;
    case 'RANGING':
      console.log('\n↔️  Ranging market: Consider mean-reversion strategies');
      break;
    case 'VOLATILE':
      console.log('\n⚡ Volatile market: Use caution, tighter stops recommended');
      break;
  }
}

/**
 * Example 4: Historical Sentiment Trend
 * 履歴センチメントトレンド
 */
export async function historicalSentimentTrend(symbol: string): Promise<void> {
  console.log('\n=== Historical Sentiment Trend Example ===');
  
  const service = getGlobalEnhancedSentimentService();
  
  // Get historical data
  const history = service.getHistoricalSentiment(symbol);
  
  if (history.length === 0) {
    console.log(`No historical data available for ${symbol}`);
    return;
  }
  
  console.log(`\nHistorical Sentiment for ${symbol} (${history.length} data points):`);
  
  // Calculate trend
  const recentScores = history.slice(-10).map(h => h.overallSentiment.overallScore);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  
  const oldScores = history.slice(0, Math.min(10, history.length)).map(h => h.overallSentiment.overallScore);
  const avgOld = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
  
  const trend = avgRecent - avgOld;
  
  console.log(`  - Average (Old): ${avgOld.toFixed(2)}`);
  console.log(`  - Average (Recent): ${avgRecent.toFixed(2)}`);
  console.log(`  - Trend: ${trend > 0 ? '📈 Improving' : trend < 0 ? '📉 Worsening' : '➡️  Stable'}`);
  console.log(`  - Change: ${(trend * 100).toFixed(1)}%`);
}

/**
 * Example 5: Data Collection Statistics
 * データ収集統計
 */
export function dataCollectionStatistics(): void {
  console.log('\n=== Data Collection Statistics Example ===');
  
  const collector = getGlobalDataCollector();
  const stats = collector.getStats();
  
  console.log('\nCollection Statistics:');
  console.log(`  - Total Collected: ${stats.totalCollected}`);
  console.log(`  - Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`  - Average Quality: ${(stats.averageQuality * 100).toFixed(1)}%`);
  console.log(`  - Errors: ${stats.errors}`);
  console.log(`  - Last Update: ${new Date(stats.lastUpdate).toLocaleString()}`);
  
  console.log('\nBy Source:');
  Object.entries(stats.bySource).forEach(([source, count]) => {
    if (count > 0) {
      console.log(`  - ${source}: ${count}`);
    }
  });
}

/**
 * Example 6: Divergence Detection
 * 乖離検出
 */
export async function divergenceDetection(symbol: string): Promise<void> {
  console.log('\n=== Divergence Detection Example ===');
  
  const service = getGlobalEnhancedSentimentService();
  const result = await service.analyzeSymbol(symbol);
  
  const divergence = result.investorSentiment.divergence;
  const institutional = result.investorSentiment.institutional;
  const retail = result.investorSentiment.retail;
  
  console.log(`\nInvestor Sentiment Divergence for ${symbol}:`);
  console.log(`  - Institutional Sentiment: ${institutional.toFixed(2)}`);
  console.log(`  - Retail Sentiment: ${retail.toFixed(2)}`);
  console.log(`  - Divergence Level: ${(divergence * 100).toFixed(1)}%`);
  
  if (divergence > 0.5) {
    console.log('\n⚠️  HIGH DIVERGENCE ALERT!');
    console.log('Institutional and retail investors have significantly different views.');
    
    if (institutional > retail) {
      console.log('📊 Institutional investors are more bullish than retail.');
      console.log('💡 Consider following institutional sentiment (smart money).');
    } else {
      console.log('📊 Retail investors are more bullish than institutional.');
      console.log('💡 Exercise caution - retail exuberance may indicate top.');
    }
  } else if (divergence > 0.3) {
    console.log('\n📊 Moderate divergence detected. Monitor the situation.');
  } else {
    console.log('\n✅ Investor sentiments are aligned.');
  }
}

/**
 * Example 7: Complete Analysis
 * 完全な分析
 */
export async function completeAnalysis(symbol: string): Promise<void> {
  console.log('\n========================================');
  console.log(`   Complete Analysis for ${symbol}`);
  console.log('========================================');
  
  try {
    await basicSentimentAnalysis(symbol);
    await leadingIndicatorsAnalysis(symbol);
    await marketContextAnalysis(symbol);
    await historicalSentimentTrend(symbol);
    await divergenceDetection(symbol);
    dataCollectionStatistics();
    
    console.log('\n========================================');
    console.log('   Analysis Complete');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error during analysis:', error);
  }
}

/**
 * Example 8: Event Handling
 * イベント処理
 */
export function setupEventHandlers(): void {
  console.log('\n=== Setting Up Event Handlers ===');
  
  const service = getGlobalEnhancedSentimentService();
  const collector = getGlobalDataCollector();
  
  // Enhanced Sentiment Service Events
  service.on('started', () => {
    console.log('✅ Enhanced Sentiment Service started');
  });
  
  service.on('analysis_completed', (result) => {
    console.log(`📊 Analysis completed for ${result.symbol}`);
  });
  
  service.on('divergence_alert', ({ symbol, divergence }) => {
    console.log(`⚠️  Divergence Alert for ${symbol}: ${(divergence * 100).toFixed(1)}%`);
  });
  
  // Data Collector Events
  collector.on('started', () => {
    console.log('✅ Data Collector started');
  });
  
  collector.on('data_collected', (data) => {
    console.log(`📥 Data collected from ${data.source.name} (Quality: ${(data.quality.overall * 100).toFixed(1)}%)`);
  });
  
  collector.on('quality_warning', ({ source, quality }) => {
    console.log(`⚠️  Quality Warning for ${source.name}: ${(quality.overall * 100).toFixed(1)}%`);
  });
  
  collector.on('collection_error', ({ source, error }) => {
    console.error(`❌ Collection Error for ${source.name}:`, error);
  });
  
  console.log('Event handlers configured');
}

/**
 * Main example runner
 */
export async function runExamples(): Promise<void> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Alternative Data Integration Examples ║');
  console.log('╚════════════════════════════════════════╝');
  
  // Setup event handlers
  setupEventHandlers();
  
  // Run complete analysis for a sample symbol
  await completeAnalysis('AAPL');
  
  // Clean up
  const service = getGlobalEnhancedSentimentService();
  service.stop();
  
  console.log('\nExamples completed successfully! 🎉');
}

// Export all examples
export default {
  basicSentimentAnalysis,
  leadingIndicatorsAnalysis,
  marketContextAnalysis,
  historicalSentimentTrend,
  dataCollectionStatistics,
  divergenceDetection,
  completeAnalysis,
  setupEventHandlers,
  runExamples
};
