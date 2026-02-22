import YahooFinance from 'yahoo-finance2';
import { ConsensusSignalService } from '../app/lib/ConsensusSignalService';
import type { OHLCV } from '../app/types';

const yf = new YahooFinance();

const SYMBOLS = [
  { symbol: 'NFLX', name: 'Netflix' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: '9984.T', name: 'ソフトバンク' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'NVDA', name: 'NVIDIA' },
];

interface Trade {
  entryPrice: number;
  exitPrice: number;
  type: 'BUY' | 'SELL';
  indicatorCount: number;
  confidence: number;
  pnlPercent: number;
  isWin: boolean;
  hitStopLoss: boolean;
  hitTakeProfit: boolean;
}

async function fetchRealData(symbol: string): Promise<OHLCV[]> {
  const result = await yf.chart(symbol, {
    period1: '2024-01-01',
    period2: new Date().toISOString().split('T')[0],
    interval: '1d',
  });
  
  return result.quotes
    .filter((q): q is NonNullable<typeof q> => q !== null)
    .map(q => ({
      timestamp: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      close: q.close ?? 0,
      volume: q.volume ?? 0,
    }));
}

function runBacktest(
  data: OHLCV[],
  minIndicator: number,
  minConfidence: number,
  trendFilter: boolean = false,
  disableML: boolean = false
): { trades: Trade[]; winRate: number; expectancy: number } {
  const service = new ConsensusSignalService();
  const trades: Trade[] = [];
  
  const stopLossPercent = 0.015;
  const takeProfitPercent = 0.06;
  const fee = 0.002;
  
  let position: { entryPrice: number; type: 'BUY' | 'SELL'; indicatorCount: number; confidence: number } | null = null;
  
  const originalWarn = console.warn;
  if (disableML) {
    console.warn = () => {};
  }
  
  for (let i = 50; i < data.length; i++) {
    const slice = data.slice(0, i + 1);
    const current = data[i];
    const consensus = service.generateConsensus(slice);
    
    if (position) {
      const pnlPercent = position.type === 'BUY'
        ? (current.close - position.entryPrice) / position.entryPrice
        : (position.entryPrice - current.close) / position.entryPrice;
      
      const hitStopLoss = pnlPercent <= -stopLossPercent;
      const hitTakeProfit = pnlPercent >= takeProfitPercent;
      
      if (hitStopLoss || hitTakeProfit) {
        const pnlAfterFees = pnlPercent - (pnlPercent > 0 ? fee : fee * 2);
        trades.push({
          entryPrice: position.entryPrice,
          exitPrice: current.close,
          type: position.type,
          indicatorCount: position.indicatorCount,
          confidence: position.confidence,
          pnlPercent: pnlAfterFees,
          isWin: pnlAfterFees > 0,
          hitStopLoss,
          hitTakeProfit,
        });
        position = null;
      }
    } else if (consensus.type !== 'HOLD') {
      const indicatorCount = consensus.indicatorCount ?? 0;
      const confidence = consensus.confidence;
      
      const isTrendingUp = slice.slice(-20).every((d, idx, arr) => 
        idx === 0 || d.close >= arr[idx - 1].close * 0.98
      );
      const isTrendingDown = slice.slice(-20).every((d, idx, arr) => 
        idx === 0 || d.close <= arr[idx - 1].close * 1.02
      );
      
      let allowed = indicatorCount >= minIndicator && confidence >= minConfidence;
      
      if (trendFilter) {
        if (consensus.type === 'BUY' && !isTrendingUp) allowed = false;
        if (consensus.type === 'SELL' && !isTrendingDown) allowed = false;
      }
      
      if (disableML) {
        if (indicatorCount < 2) allowed = false;
      }
      
      if (allowed) {
        position = {
          entryPrice: current.close,
          type: consensus.type === 'BUY' ? 'BUY' : 'SELL',
          indicatorCount,
          confidence,
        };
      }
    }
  }
  
  console.warn = originalWarn;
  
  if (trades.length === 0) return { trades: [], winRate: 0, expectancy: 0 };
  
  const wins = trades.filter(t => t.isWin).length;
  const winRate = wins / trades.length;
  const expectancy = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length;
  
  return { trades, winRate, expectancy };
}

async function main() {
  console.log('========================================');
  console.log('フィルター条件 最適化テスト');
  console.log('========================================\n');
  
  const conditions = [
    { minIndicator: 0, minConfidence: 70, trendFilter: false, label: '現状' },
    { minIndicator: 1, minConfidence: 70, trendFilter: false, label: '指標1+' },
    { minIndicator: 0, minConfidence: 70, trendFilter: true, label: 'トレンドフィルター' },
    { minIndicator: 1, minConfidence: 70, trendFilter: true, label: '指標1+ & トレンド' },
    { minIndicator: 0, minConfidence: 80, trendFilter: true, label: '信頼度80+ & トレンド' },
    { minIndicator: 1, minConfidence: 80, trendFilter: true, label: '指標1+ & 信頼度80+ & トレンド' },
  ];
  
  const allResults: Map<string, { trades: number; wins: number; expectancy: number }[]> = new Map();
  
  for (const sym of SYMBOLS) {
    console.log(`[${sym.symbol}] ${sym.name} データ取得中...`);
    const data = await fetchRealData(sym.symbol);
    console.log(`  データ: ${data.length}日分\n`);
    
    for (const cond of conditions) {
      const { trades, winRate, expectancy } = runBacktest(data, cond.minIndicator, cond.minConfidence, cond.trendFilter);
      
      if (!allResults.has(cond.label)) {
        allResults.set(cond.label, []);
      }
      
      allResults.get(cond.label)!.push({
        trades: trades.length,
        wins: trades.filter(t => t.isWin).length,
        expectancy,
      });
    }
  }
  
  console.log('========================================');
  console.log('結果比較');
  console.log('========================================\n');
  
  console.log('| 条件 | 総取引 | 勝数 | 勝率 | 期待値 | 目標達成 |');
  console.log('|------|--------|------|------|--------|----------|');
  
  for (const cond of conditions) {
    const results = allResults.get(cond.label) || [];
    const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
    const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
    const avgExpectancy = results.reduce((sum, r) => sum + r.expectancy, 0) / results.length;
    const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
    const achieved = winRate >= 0.6 && avgExpectancy > 0;
    
    console.log(
      `| ${cond.label} | ${totalTrades} | ${totalWins} | ${(winRate * 100).toFixed(1)}% | ${(avgExpectancy * 100).toFixed(2)}% | ${achieved ? '✅' : '❌'} |`
    );
  }
  
  console.log('\n========================================');
  console.log('結論');
  console.log('========================================');
  
  let bestCondition = conditions[0];
  let bestWinRate = 0;
  
  for (const cond of conditions) {
    const results = allResults.get(cond.label) || [];
    const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
    const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
    const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
    
    if (winRate > bestWinRate) {
      bestWinRate = winRate;
      bestCondition = cond;
    }
  }
  
  console.log(`\n最高勝率: ${bestCondition.label} (${(bestWinRate * 100).toFixed(1)}%)`);
}

main().catch(console.error);
