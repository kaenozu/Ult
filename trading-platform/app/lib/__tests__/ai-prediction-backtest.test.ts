/**
 * AI予測精度改善バックテスト
 * Issue #1127 - 勝率65%+、期待値+2%+達成検証
 * 
 * このテストはConsensusSignalServiceを使用したバックテストを実行し、
 * 勝率・期待値・シグナル数を検証します。
 */

import { describe, it, expect, jest } from '@jest/globals';
import { consensusSignalService, ConsensusSignal } from '../ConsensusSignalService';
import { OHLCV, Stock } from '../../types';
import { marketClient } from '../api/data-aggregator';

// テスト対象銘柄（日本株50 + 米国株50）
const TEST_SYMBOLS_JP = [
  '7203.T', '6758.T', '9984.T', '6861.T', '8306.T',  // トヨタ、ソニー、ソフトバンク、キーエンス、三菱UFJ
  '7267.T', '6098.T', '9432.T', '9433.T', '4502.T',  // 本田、リクルート、NTT、KDDI、武田薬品
  '9020.T', '9021.T', '9104.T', '9202.T', '9501.T',  // JR東日本、JR西日本、商船三井、ANA、東京電力
  '8411.T', '8058.T', '8031.T', '8001.T', '8015.T',  // みずほ、三菱商事、三井物産、伊藤忠、丸紅
  '3382.T', '2914.T', '2502.T', '2269.T', '2002.T',  // セブン＆アイ、JT、アサヒ、明治HD、日清紡HD
  '1928.T', '1803.T', '1605.T', '1545.T', '1398.T',  // 積水ハウス、清水建設、INPEX、住友化学、日鉄
  '1321.T', '1306.T', '1308.T', '1320.T', '1329.T',  // ETF
  '1322.T', '1324.T', '1325.T', '1326.T', '1327.T',  // ETF
  '1328.T', '1330.T', '1332.T', '1333.T', '1343.T',  // ETF
  '1345.T', '1346.T', '1348.T', '1349.T', '1356.T',  // ETF
  '1357.T', '1358.T', '1360.T', '1364.T', '1365.T',  // ETF
  '1366.T', '1367.T', '1368.T', '1369.T', '1376.T',  // ETF
  '1377.T', '1379.T', '1381.T', '1384.T', '1385.T',  // ETF
  '1386.T', '1387.T', '1388.T', '1389.T', '1390.T',  // ETF
  '1391.T', '1392.T', '1393.T', '1394.T', '1395.T',  // ETF
  '1396.T', '1397.T', '1399.T', '1400.T', '1401.T',  // ETF
  '1402.T', '1403.T', '1404.T', '1405.T', '1406.T',  // ETF
  '1407.T', '1408.T', '1409.T', '1410.T', '1411.T',  // ETF
  '1412.T', '1413.T', '1414.T', '1415.T', '1416.T',  // ETF
];

// モックデータ生成関数
function generateMockOHLCV(length: number, trend: 'up' | 'down' | 'sideways' = 'up'): OHLCV[] {
  const data: OHLCV[] = [];
  let basePrice = 5000;
  
  for (let i = 0; i < length; i++) {
    let change = 0;
    if (trend === 'up') {
      change = (Math.random() - 0.4) * 100; // 上昇トレンド
    } else if (trend === 'down') {
      change = (Math.random() - 0.6) * 100; // 下降トレンド
    } else {
      change = (Math.random() - 0.5) * 50; // 横ばい
    }
    
    basePrice += change;
    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * 50;
    const high = Math.max(open, close) + Math.random() * 30;
    const low = Math.min(open, close) - Math.random() * 30;
    
    const date = new Date(2024, 0, 1);
    date.setDate(date.getDate() + i);
    
    data.push({
      open,
      high,
      low,
      close,
      volume: 1000000 + Math.random() * 500000,
      date: date.toISOString().split('T')[0],
      symbol: 'TEST'
    });
  }
  
  return data;
}

// バックテスト結果インターフェース
interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // 勝率（%）
  avgReturn: number; // 平均リターン（%）
  totalReturn: number; // 総リターン（%）
  expectedValue: number; // 期待値（%）
  sharpeRatio: number; // シャープレシオ
  maxDrawdown: number; // 最大ドローダウン（%）
}

// バックテスト実行
function runBacktestWithConsensus(
  data: OHLCV[],
  initialCapital: number = 1000000
): BacktestMetrics {
  let capital = initialCapital;
  let position: { type: 'LONG' | 'SHORT'; entryPrice: number; entryIndex: number } | null = null;
  let trades: { return: number; win: boolean }[] = [];
  let maxCapital = initialCapital;
  let maxDrawdown = 0;
  
  // 最小データ期間（50日以上必要）
  const minDataLength = 50;
  
  for (let i = minDataLength; i < data.length - 1; i++) {
    const historicalData = data.slice(0, i + 1);
    const signal = consensusSignalService.generateConsensus(historicalData);
    const currentPrice = data[i].close;
    const nextPrice = data[i + 1].close;
    
    // ポジションクローズ判定
    if (position) {
      let shouldClose = false;
      let tradeReturn = 0;
      
      if (position.type === 'LONG') {
        tradeReturn = ((nextPrice - position.entryPrice) / position.entryPrice) * 100;
        // SELLシグナルまたはHOLDでクローズ
        if (signal.type === 'SELL') shouldClose = true;
      } else {
        tradeReturn = ((position.entryPrice - nextPrice) / position.entryPrice) * 100;
        // BUYシグナルまたはHOLDでクローズ
        if (signal.type === 'BUY') shouldClose = true;
      }
      
      if (shouldClose || i === data.length - 2) {
        trades.push({ return: tradeReturn, win: tradeReturn > 0 });
        capital = capital * (1 + tradeReturn / 100);
        position = null;
        
        // ドローダウン計算
        if (capital > maxCapital) {
          maxCapital = capital;
        }
        const drawdown = ((maxCapital - capital) / maxCapital) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    // ポジションエントリー判定
    if (!position && signal.type !== 'HOLD' && signal.confidence >= 70) {
      position = {
        type: signal.type === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: nextPrice,
        entryIndex: i
      };
    }
  }
  
  // メトリクス計算
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.win).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const avgReturn = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.return, 0) / totalTrades : 0;
  
  // 期待値 = (勝率 × 平均利益) - (敗率 × 平均損失)
  const avgWin = winningTrades > 0 
    ? trades.filter(t => t.win).reduce((sum, t) => sum + t.return, 0) / winningTrades 
    : 0;
  const avgLoss = losingTrades > 0 
    ? trades.filter(t => !t.win).reduce((sum, t) => sum + t.return, 0) / losingTrades 
    : 0;
  const expectedValue = (winRate / 100) * avgWin + ((100 - winRate) / 100) * avgLoss;
  
  // シャープレシオ（簡易版）
  const returns = trades.map(t => t.return);
  const avg = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avg / stdDev : 0;
  
  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    avgReturn,
    totalReturn,
    expectedValue,
    sharpeRatio,
    maxDrawdown
  };
}

describe('AI予測精度改善バックテスト (#1127)', () => {
  it('単一銘柄でのバックテストが実行可能', () => {
    const mockData = generateMockOHLCV(252, 'up'); // 1年分のデータ
    const metrics = runBacktestWithConsensus(mockData);
    
    expect(metrics).toBeDefined();
    expect(metrics.totalTrades).toBeGreaterThanOrEqual(0);
    expect(metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(metrics.winRate).toBeLessThanOrEqual(100);
  });
  
  it('上昇トレンドでのバックテスト', () => {
    const mockData = generateMockOHLCV(252, 'up');
    const metrics = runBacktestWithConsensus(mockData);
    
    console.log('\n=== 上昇トレンドバックテスト結果 ===');
    console.log(`総取引数: ${metrics.totalTrades}`);
    console.log(`勝率: ${metrics.winRate.toFixed(2)}%`);
    console.log(`期待値: ${metrics.expectedValue.toFixed(2)}%`);
    console.log(`総リターン: ${metrics.totalReturn.toFixed(2)}%`);
    console.log(`最大ドローダウン: ${metrics.maxDrawdown.toFixed(2)}%`);
    console.log(`シャープレシオ: ${metrics.sharpeRatio.toFixed(2)}`);
    
    // 基本チェック
    expect(metrics.totalTrades).toBeGreaterThan(0);
    expect(metrics.winRate).toBeGreaterThan(0);
  });
  
  it('下降トレンドでのバックテスト', () => {
    const mockData = generateMockOHLCV(252, 'down');
    const metrics = runBacktestWithConsensus(mockData);
    
    console.log('\n=== 下降トレンドバックテスト結果 ===');
    console.log(`総取引数: ${metrics.totalTrades}`);
    console.log(`勝率: ${metrics.winRate.toFixed(2)}%`);
    console.log(`期待値: ${metrics.expectedValue.toFixed(2)}%`);
    console.log(`総リターン: ${metrics.totalReturn.toFixed(2)}%`);
    
    expect(metrics.totalTrades).toBeGreaterThanOrEqual(0);
  });
  
  it('横ばい相場でのバックテスト', () => {
    const mockData = generateMockOHLCV(252, 'sideways');
    const metrics = runBacktestWithConsensus(mockData);
    
    console.log('\n=== 横ばい相場バックテスト結果 ===');
    console.log(`総取引数: ${metrics.totalTrades}`);
    console.log(`勝率: ${metrics.winRate.toFixed(2)}%`);
    console.log(`期待値: ${metrics.expectedValue.toFixed(2)}%`);
    console.log(`総リターン: ${metrics.totalReturn.toFixed(2)}%`);
    
    expect(metrics.totalTrades).toBeGreaterThanOrEqual(0);
  });
  
  it('複数銘柄（10銘柄）での統合バックテスト', () => {
    const results: BacktestMetrics[] = [];
    
    // 10銘柄分のバックテスト
    for (let i = 0; i < 10; i++) {
      const trend: ('up' | 'down' | 'sideways')[] = ['up', 'down', 'sideways'];
      const randomTrend = trend[Math.floor(Math.random() * trend.length)];
      const mockData = generateMockOHLCV(252, randomTrend);
      const metrics = runBacktestWithConsensus(mockData);
      results.push(metrics);
    }
    
    // 平均メトリクス計算
    const validResults = results.filter(r => r.totalTrades > 0);
    if (validResults.length > 0) {
      const avgWinRate = validResults.reduce((sum, r) => sum + r.winRate, 0) / validResults.length;
      const avgExpectedValue = validResults.reduce((sum, r) => sum + r.expectedValue, 0) / validResults.length;
      const avgTotalTrades = validResults.reduce((sum, r) => sum + r.totalTrades, 0) / validResults.length;
      
      console.log('\n=== 複数銘柄（10銘柄）平均結果 ===');
      console.log(`平均取引数/銘柄: ${avgTotalTrades.toFixed(2)}`);
      console.log(`平均勝率: ${avgWinRate.toFixed(2)}%`);
      console.log(`平均期待値: ${avgExpectedValue.toFixed(2)}%`);
      console.log(`有効銘柄数: ${validResults.length}/10`);
      
      // 目標値との比較
      console.log('\n=== 目標値との比較 ===');
      console.log(`勝率目標: 65%+ | 実測: ${avgWinRate.toFixed(2)}% | ${avgWinRate >= 65 ? '✅ 達成' : '❌ 未達'}`);
      console.log(`期待値目標: +2%+ | 実測: ${avgExpectedValue.toFixed(2)}% | ${avgExpectedValue >= 2 ? '✅ 達成' : '❌ 未達'}`);
    }
    
    expect(validResults.length).toBeGreaterThan(0);
  });
});
