/**
 * WinRateMaximizer Usage Example
 * 
 * このファイルは、WinRateMaximizerの使用方法を示す実践的な例です。
 */

import { winRateMaximizer, TradeScenario, WinRateOptimization } from './index';
import { OHLCV } from '@/app/types';

// ============================================================================
// Example 1: 過去のトレード履歴から学習
// ============================================================================

export function example1_learnFromHistory() {
  console.log('=== Example 1: 過去のトレード履歴から学習 ===\n');
  
  // 実際のトレード履歴をシミュレート
  const historicalTrades: TradeScenario[] = [
    {
      id: 'trade-001',
      timestamp: '2024-01-15T10:30:00Z',
      marketConditions: {
        trend: 'UP',
        volatility: 'MEDIUM',
        volume: 'HIGH',
        momentum: 3.2,
      },
      indicators: {
        rsi: 42,
        macd: 1.5,
        adx: 32,
        bbPosition: -0.3,
        smaAlignment: true,
      },
      outcome: {
        action: 'BUY',
        entryPrice: 100,
        exitPrice: 107,
        profit: 7,
        profitPercent: 7,
        holdingPeriod: 180,
        won: true,
      },
    },
    {
      id: 'trade-002',
      timestamp: '2024-01-16T14:00:00Z',
      marketConditions: {
        trend: 'UP',
        volatility: 'LOW',
        volume: 'MEDIUM',
        momentum: 2.1,
      },
      indicators: {
        rsi: 48,
        macd: 0.8,
        adx: 28,
        bbPosition: -0.1,
        smaAlignment: true,
      },
      outcome: {
        action: 'BUY',
        entryPrice: 107,
        exitPrice: 112,
        profit: 5,
        profitPercent: 4.67,
        holdingPeriod: 120,
        won: true,
      },
    },
    {
      id: 'trade-003',
      timestamp: '2024-01-17T11:15:00Z',
      marketConditions: {
        trend: 'DOWN',
        volatility: 'HIGH',
        volume: 'HIGH',
        momentum: -4.5,
      },
      indicators: {
        rsi: 72,
        macd: -2.1,
        adx: 35,
        bbPosition: 0.7,
        smaAlignment: false,
      },
      outcome: {
        action: 'BUY',
        entryPrice: 112,
        exitPrice: 108,
        profit: -4,
        profitPercent: -3.57,
        holdingPeriod: 90,
        won: false,
      },
    },
    // ... more trades
  ];
  
  // 学習
  winRateMaximizer.learnFromHistory(historicalTrades);
  
  // 統計情報を表示
  const stats = winRateMaximizer.getOptimizationStats();
  console.log('学習完了:');
  console.log(`- 総シナリオ数: ${stats.totalScenarios}`);
  console.log(`- 平均勝率: ${stats.avgWinRate.toFixed(1)}%`);
  console.log();
}

// ============================================================================
// Example 2: リアルタイム取引最適化
// ============================================================================

export function example2_optimizeCurrentTrade() {
  console.log('=== Example 2: リアルタイム取引最適化 ===\n');
  
  // 現在の市場データ（模擬）
  const currentMarketData: OHLCV[] = generateMockMarketData();
  
  // 最適化を実行
  const optimization = winRateMaximizer.optimize(
    currentMarketData,
    'AAPL',
    100000 // ポートフォリオ価値: $100,000
  );
  
  // 結果を表示
  displayOptimizationResult(optimization);
}

// ============================================================================
// Example 3: リスク管理を含む取引判断
// ============================================================================

export function example3_riskManagedTrading() {
  console.log('=== Example 3: リスク管理を含む取引判断 ===\n');
  
  const currentMarketData: OHLCV[] = generateMockMarketData();
  const optimization = winRateMaximizer.optimize(currentMarketData, 'TSLA', 100000);
  
  // リスク評価に基づいて取引を実行するか判断
  console.log('取引判断プロセス:\n');
  
  // 1. アクションを確認
  console.log(`1. 推奨アクション: ${optimization.action}`);
  
  if (optimization.action === 'WAIT') {
    console.log('   → 取引を見送ります（データ不足または低信頼度）');
    return;
  }
  
  // 2. リスクレベルを確認
  console.log(`2. リスクレベル: ${optimization.risk.level}`);
  
  if (optimization.risk.level === 'HIGH') {
    console.log('   → ⚠️ 高リスク: 取引を慎重に検討');
  }
  
  // 3. 勝率を確認
  console.log(`3. 期待勝率: ${optimization.expectedWinRate.toFixed(1)}%`);
  
  if (optimization.expectedWinRate < 55) {
    console.log('   → ⚠️ 低勝率: 取引を見送ることを推奨');
    return;
  }
  
  // 4. 市場条件マッチを確認
  console.log(`4. 市場条件マッチ: ${optimization.marketConditions.match}`);
  console.log(`   類似シナリオ: ${optimization.marketConditions.similarPastScenarios}件`);
  
  if (optimization.marketConditions.match === 'POOR') {
    console.log('   → ⚠️ 市場条件が過去データと一致しません');
  }
  
  // 5. 警告を確認
  if (optimization.warnings.length > 0) {
    console.log('\n⚠️ 警告:');
    optimization.warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  // 6. 取引を実行
  if (optimization.expectedWinRate >= 55 && optimization.risk.level !== 'HIGH') {
    console.log('\n✅ 取引を実行します:');
    console.log(`   エントリー: $${optimization.optimalEntry.price.toFixed(2)}`);
    console.log(`   ストップロス: $${optimization.optimalExit.stopLoss.toFixed(2)}`);
    console.log(`   テイクプロフィット: $${optimization.optimalExit.takeProfit.toFixed(2)}`);
    console.log(`   ポジションサイズ: ${optimization.positionSizing.recommended.toFixed(1)}%`);
    console.log(`   理由: ${optimization.reasoning.join(', ')}`);
  } else {
    console.log('\n❌ 取引を見送ります');
  }
  
  console.log();
}

// ============================================================================
// Example 4: カスタム設定での最適化
// ============================================================================

export function example4_customConfiguration() {
  console.log('=== Example 4: カスタム設定での最適化 ===\n');
  
  // カスタム設定で新しいオプティマイザーを作成
  const conservativeOptimizer = new (require('./WinRateMaximizer').WinRateMaximizer)({
    minWinRateForTrade: 65,        // より高い勝率を要求
    maxRiskPerTrade: 1,             // リスクを1%に制限
    basePositionSize: 5,            // 小さめのポジション
    maxPositionSize: 15,            // 最大15%に制限
    minConfidenceForTrade: 75,     // 高い信頼度を要求
  });
  
  console.log('保守的な設定:');
  console.log('- 最低勝率: 65%');
  console.log('- 最大リスク: 1%');
  console.log('- ポジションサイズ: 5-15%');
  console.log('- 最低信頼度: 75%\n');
  
  // 学習
  const scenarios = generateMockScenarios(30, 0.7); // 70%勝率
  conservativeOptimizer.learnFromHistory(scenarios);
  
  // 最適化
  const data = generateMockMarketData();
  const optimization = conservativeOptimizer.optimize(data, 'MSFT', 100000);
  
  displayOptimizationResult(optimization);
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateMockMarketData(): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 150;
  
  for (let i = 0; i < 100; i++) {
    const change = (Math.random() - 0.45) * 3; // 上昇傾向
    price += change;
    
    data.push({
      date: new Date(Date.now() - (100 - i) * 60000).toISOString(),
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }
  
  return data;
}

function generateMockScenarios(count: number, winRate: number): TradeScenario[] {
  const scenarios: TradeScenario[] = [];
  
  for (let i = 0; i < count; i++) {
    const won = Math.random() < winRate;
    
    scenarios.push({
      id: `scenario-${i}`,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      marketConditions: {
        trend: won ? 'UP' : 'DOWN',
        volatility: 'MEDIUM',
        volume: 'MEDIUM',
        momentum: won ? 2 : -2,
      },
      indicators: {
        rsi: won ? 45 : 65,
        macd: won ? 1 : -1,
        adx: 30,
        bbPosition: 0,
        smaAlignment: won,
      },
      outcome: {
        action: 'BUY',
        entryPrice: 100,
        exitPrice: won ? 105 : 97,
        profit: won ? 5 : -3,
        profitPercent: won ? 5 : -3,
        holdingPeriod: 120,
        won,
      },
    });
  }
  
  return scenarios;
}

function displayOptimizationResult(optimization: WinRateOptimization) {
  console.log('最適化結果:\n');
  
  console.log('📊 基本情報:');
  console.log(`   アクション: ${optimization.action}`);
  console.log(`   信頼度: ${optimization.confidence}%`);
  console.log(`   期待勝率: ${optimization.expectedWinRate.toFixed(1)}%`);
  console.log();
  
  console.log('🎯 エントリー:');
  console.log(`   価格: $${optimization.optimalEntry.price.toFixed(2)}`);
  console.log(`   タイミング: ${optimization.optimalEntry.timing}`);
  if (optimization.optimalEntry.waitCondition) {
    console.log(`   条件: ${optimization.optimalEntry.waitCondition}`);
  }
  console.log();
  
  console.log('🚪 エグジット:');
  console.log(`   テイクプロフィット: $${optimization.optimalExit.takeProfit.toFixed(2)}`);
  console.log(`   ストップロス: $${optimization.optimalExit.stopLoss.toFixed(2)}`);
  console.log(`   トレーリングストップ: ${optimization.optimalExit.trailingStop ? 'はい' : 'いいえ'}`);
  console.log();
  
  console.log('💰 ポジションサイズ:');
  console.log(`   推奨: ${optimization.positionSizing.recommended.toFixed(1)}%`);
  console.log(`   範囲: ${optimization.positionSizing.min}-${optimization.positionSizing.max}%`);
  console.log(`   根拠: ${optimization.positionSizing.rationale}`);
  console.log();
  
  console.log('🌍 市場条件:');
  console.log(`   マッチ度: ${optimization.marketConditions.match}`);
  console.log(`   類似シナリオ: ${optimization.marketConditions.similarPastScenarios}件`);
  console.log(`   類似シナリオの平均勝率: ${optimization.marketConditions.avgWinRateInSimilarScenarios.toFixed(1)}%`);
  console.log(`   類似シナリオの平均リターン: ${optimization.marketConditions.avgReturnInSimilarScenarios.toFixed(2)}%`);
  console.log();
  
  console.log('⚠️ リスク:');
  console.log(`   レベル: ${optimization.risk.level}`);
  console.log(`   損失確率: ${optimization.risk.probabilityOfLoss.toFixed(1)}%`);
  console.log(`   期待損失: ${optimization.risk.expectedLoss.toFixed(2)}%`);
  console.log(`   最大ドローダウン: ${optimization.risk.maxDrawdown.toFixed(2)}%`);
  console.log();
  
  console.log('💡 推奨理由:');
  optimization.reasoning.forEach(r => console.log(`   ✓ ${r}`));
  console.log();
  
  if (optimization.warnings.length > 0) {
    console.log('⚠️ 警告:');
    optimization.warnings.forEach(w => console.log(`   ! ${w}`));
    console.log();
  }
}

// ============================================================================
// Run Examples
// ============================================================================

if (require.main === module) {
  console.log('\n🚀 WinRateMaximizer 使用例\n');
  console.log('='.repeat(60) + '\n');
  
  try {
    example1_learnFromHistory();
    example2_optimizeCurrentTrade();
    example3_riskManagedTrading();
    example4_customConfiguration();
    
    console.log('='.repeat(60));
    console.log('\n✅ すべての例が正常に実行されました\n');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}
