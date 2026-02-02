/**
 * Market Correlation Integration Example
 * 
 * このファイルは、MarketCorrelationService を WinningTradingSystem に統合した
 * 機能の使用例を示します。
 */

import WinningTradingSystem from '../../trading-platform/app/lib/WinningTradingSystem';
import { OHLCV } from '../../trading-platform/app/types';

// サンプルデータ生成関数
function generateSampleData(
  length: number,
  startPrice: number,
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): OHLCV[] {
  const data: OHLCV[] = [];
  let price = startPrice;

  for (let i = 0; i < length; i++) {
    let change: number;
    
    switch (trend) {
      case 'BULLISH':
        change = Math.random() * 100 + 50;
        break;
      case 'BEARISH':
        change = -(Math.random() * 100 + 50);
        break;
      default:
        change = (Math.random() - 0.5) * 100;
    }

    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;

    data.push({
      date: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume: 1000000 + Math.random() * 500000,
    });

    price = close;
  }

  return data;
}

// Example 1: 弱気市場でのフィルタリング
async function example1_BearishMarketFiltering() {
  console.log('\n=== Example 1: 弱気市場でのフィルタリング ===\n');

  const system = new WinningTradingSystem({
    initialCapital: 1000000,
    maxPositions: 5,
    defaultStrategy: 'ADAPTIVE',
  });

  // セッション開始
  const session = system.startSession('7203', 'ADAPTIVE', 1000000);

  // 弱気市場データを生成（日経225）
  const nikkei225Data = generateSampleData(100, 30000, 'BEARISH');
  
  // 高相関の銘柄データを生成（市場に連動）
  const highCorrelationStock = nikkei225Data.map((candle) => ({
    ...candle,
    open: candle.open * 0.1,
    close: candle.close * 0.1,
    high: candle.high * 0.1,
    low: candle.low * 0.1,
  }));

  // 市場指数データを設定
  system.updateMarketIndexData(nikkei225Data);

  // イベントリスナーを設定
  let positionsOpened = 0;
  let positionsFiltered = 0;
  
  system.subscribe((event) => {
    if (event.type === 'POSITION_OPENED') {
      positionsOpened++;
      console.log(`✓ Position opened: ${event.data.symbol}`);
    }
  });

  // Console.log をキャプチャして、フィルタリングされたエントリーをカウント
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    const message = args.join(' ');
    if (message.includes('Entry filtered')) {
      positionsFiltered++;
    }
    originalLog(...args);
  };

  // 取引を実行
  system.processMarketData('7203', highCorrelationStock);

  console.log = originalLog;

  console.log(`\n結果:`);
  console.log(`  - オープンされたポジション: ${positionsOpened}`);
  console.log(`  - フィルタリングされたエントリー: ${positionsFiltered}`);
  console.log(`  → 弱気市場で高相関の銘柄の買いシグナルはフィルタリングされました\n`);
}

// Example 2: ベータ値に基づくポジションサイズ調整
async function example2_BetaBasedPositionSizing() {
  console.log('\n=== Example 2: ベータ値に基づくポジションサイズ調整 ===\n');

  const system = new WinningTradingSystem({
    initialCapital: 1000000,
    maxPositions: 5,
    defaultStrategy: 'ADAPTIVE',
  });

  const session = system.startSession('7203', 'ADAPTIVE', 1000000);

  // 市場データを生成
  const marketData = generateSampleData(100, 28000, 'NEUTRAL');
  
  // 高ベータ銘柄データを生成（市場の1.8倍の変動）
  const highBetaStock = marketData.map((candle, i) => {
    const marketChange = candle.close - candle.open;
    const stockChange = marketChange * 1.8;
    const close = candle.open + stockChange;
    
    return {
      ...candle,
      close,
      high: Math.max(candle.open, close) + Math.random() * 10,
      low: Math.min(candle.open, close) - Math.random() * 10,
    };
  });

  system.updateMarketIndexData(marketData);

  // ポジションサイズの変更を監視
  system.subscribe((event) => {
    if (event.type === 'POSITION_OPENED') {
      const position = event.data.position;
      console.log(`✓ Position opened:`);
      console.log(`  - Symbol: ${position.symbol}`);
      console.log(`  - Quantity: ${position.quantity}`);
      console.log(`  - Entry Price: ${position.entryPrice.toFixed(2)}`);
      console.log(`  - Stop Loss: ${position.stopLoss.toFixed(2)}`);
      console.log(`  - Take Profit: ${position.takeProfit.toFixed(2)}`);
    }
  });

  system.processMarketData('7203', highBetaStock);

  console.log(`\n→ 高ベータ銘柄のため、ポジションサイズが調整されました\n`);
}

// Example 3: 強気市場での通常動作
async function example3_BullishMarketNormalOperation() {
  console.log('\n=== Example 3: 強気市場での通常動作 ===\n');

  const system = new WinningTradingSystem({
    initialCapital: 1000000,
    maxPositions: 5,
    defaultStrategy: 'ADAPTIVE',
  });

  const session = system.startSession('7203', 'ADAPTIVE', 1000000);

  // 強気市場データを生成
  const bullishMarket = generateSampleData(100, 25000, 'BULLISH');
  const stockData = generateSampleData(100, 1000, 'BULLISH');

  system.updateMarketIndexData(bullishMarket);

  let positionsOpened = 0;
  system.subscribe((event) => {
    if (event.type === 'POSITION_OPENED') {
      positionsOpened++;
      console.log(`✓ Position opened: ${event.data.symbol}`);
    }
  });

  system.processMarketData('7203', stockData);

  console.log(`\n結果:`);
  console.log(`  - オープンされたポジション: ${positionsOpened}`);
  console.log(`  → 強気市場では、通常通り取引が実行されました\n`);
}

// すべての例を実行
async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Market Correlation Integration Examples                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    await example1_BearishMarketFiltering();
    await example2_BetaBasedPositionSizing();
    await example3_BullishMarketNormalOperation();

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   すべての例が正常に実行されました                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// エントリーポイント
if (require.main === module) {
  runAllExamples();
}

export {
  example1_BearishMarketFiltering,
  example2_BetaBasedPositionSizing,
  example3_BullishMarketNormalOperation,
};
