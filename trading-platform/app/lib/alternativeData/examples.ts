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
import { logger } from '@/app/core/logger';
export async function basicSentimentAnalysis(symbol: string): Promise<void> {
  
  // Get the global service instance
  const service = getGlobalEnhancedSentimentService();
  
  // Start the service (if not already started)
  try {
    service.start();
  } catch (error) {
    // Service might already be running
  }
  
  // Analyze sentiment for a symbol
  const result = await service.analyzeSymbol(symbol);
  
}

/**
 * Example 2: Leading Indicators Analysis
 * 先行指標分析
 */
export async function leadingIndicatorsAnalysis(symbol: string): Promise<void> {
  
  const service = getGlobalEnhancedSentimentService();
  const result = await service.analyzeSymbol(symbol);
  
  const indicators = result.leadingIndicators;
  
  
  // Interpretation
  if (indicators.earlySignalStrength > 0.7) {
  } else if (indicators.earlySignalStrength > 0.4) {
  } else {
  }
}

/**
 * Example 3: Market Context Analysis
 * 市場コンテキスト分析
 */
export async function marketContextAnalysis(symbol: string): Promise<void> {
  
  const service = getGlobalEnhancedSentimentService();
  const result = await service.analyzeSymbol(symbol);
  
  const context = result.marketContext;
  
  
  // Strategy recommendation based on regime
  switch (context.regime) {
    case 'TRENDING':
      break;
    case 'RANGING':
      break;
    case 'VOLATILE':
      break;
  }
}

/**
 * Example 4: Historical Sentiment Trend
 * 履歴センチメントトレンド
 */
export async function historicalSentimentTrend(symbol: string): Promise<void> {
  
  const service = getGlobalEnhancedSentimentService();
  
  // Get historical data
  const history = service.getHistoricalSentiment(symbol);
  
  if (history.length === 0) {
    return;
  }
  
  
  // Calculate trend
  const recentScores = history.slice(-10).map(h => h.overallSentiment.overallScore);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  
  const oldScores = history.slice(0, Math.min(10, history.length)).map(h => h.overallSentiment.overallScore);
  const avgOld = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
  
  const trend = avgRecent - avgOld;
  
}

/**
 * Example 5: Data Collection Statistics
 * データ収集統計
 */
export function dataCollectionStatistics(): void {
  
  const collector = getGlobalDataCollector();
  const stats = collector.getStats();
  
  
  Object.entries(stats.bySource).forEach(([source, count]) => {
    if (count > 0) {
    }
  });
}

/**
 * Example 6: Divergence Detection
 * 乖離検出
 */
export async function divergenceDetection(symbol: string): Promise<void> {
  
  const service = getGlobalEnhancedSentimentService();
  const result = await service.analyzeSymbol(symbol);
  
  const divergence = result.investorSentiment.divergence;
  const institutional = result.investorSentiment.institutional;
  const retail = result.investorSentiment.retail;
  
  
  if (divergence > 0.5) {
    
    if (institutional > retail) {
    } else {
    }
  } else if (divergence > 0.3) {
  } else {
  }
}

/**
 * Example 7: Complete Analysis
 * 完全な分析
 */
export async function completeAnalysis(symbol: string): Promise<void> {
  
  try {
    await basicSentimentAnalysis(symbol);
    await leadingIndicatorsAnalysis(symbol);
    await marketContextAnalysis(symbol);
    await historicalSentimentTrend(symbol);
    await divergenceDetection(symbol);
    dataCollectionStatistics();
    
  } catch (error) {
    logger.error('Error during analysis:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Example 8: Event Handling
 * イベント処理
 */
export function setupEventHandlers(): void {
  
  const service = getGlobalEnhancedSentimentService();
  const collector = getGlobalDataCollector();
  
  // Enhanced Sentiment Service Events
  service.on('started', () => {
  });
  
  service.on('analysis_completed', (result: any) => {
  });
  
  service.on('divergence_alert', ({ symbol, divergence }: any) => {
  });
  
  // Data Collector Events
  collector.on('started', () => {
  });
  
  collector.on('data_collected', (data: any) => {
  });
  
  collector.on('quality_warning', ({ source, quality }: any) => {
  });
  
  collector.on('collection_error', ({ source, error }: any) => {
    logger.error(`❌ Collection Error for ${source.name}:`, error);
  });
  
}

/**
 * Main example runner
 */
export async function runExamples(): Promise<void> {
  
  // Setup event handlers
  setupEventHandlers();
  
  // Run complete analysis for a sample symbol
  await completeAnalysis('AAPL');
  
  // Clean up
  const service = getGlobalEnhancedSentimentService();
  service.stop();
  
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
