import YahooFinance from 'yahoo-finance2';
import { ConsensusSignalService } from '../app/lib/ConsensusSignalService';
import type { OHLCV } from '../app/types';

const yf = new YahooFinance();

const SYMBOLS = [
  { symbol: 'NFLX', name: 'Netflix' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: 'AAPL', name: 'Apple' },
];

interface Trade {
  pnlPercent: number;
  isWin: boolean;
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
  stopLossPercent: number,
  takeProfitPercent: number
): { trades: Trade[]; winRate: number; expectancy: number } {
  const service = new ConsensusSignalService();
  const trades: Trade[] = [];
  const fee = 0.002;
  
  let position: { entryPrice: number; type: 'BUY' | 'SELL' } | null = null;
  
  const originalLog = console.log;
  console.log = () => {};
  
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
          pnlPercent: pnlAfterFees,
          isWin: pnlAfterFees > 0,
        });
        position = null;
      }
    } else if (consensus.type !== 'HOLD' && consensus.confidence >= 70) {
      position = {
        entryPrice: current.close,
        type: consensus.type === 'BUY' ? 'BUY' : 'SELL',
      };
    }
  }
  
  console.log = originalLog;
  
  if (trades.length === 0) return { trades: [], winRate: 0, expectancy: 0 };
  
  const wins = trades.filter(t => t.isWin).length;
  const winRate = wins / trades.length;
  const expectancy = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length;
  
  return { trades, winRate, expectancy };
}

async function main() {
  console.log('========================================');
  console.log('SL/TP比率 vs 勝率 テスト');
  console.log('========================================\n');
  
  const configs = [
    { sl: 0.015, tp: 0.06, rr: '1:4', label: '現状 (SL 1.5%, TP 6%)' },
    { sl: 0.02, tp: 0.04, rr: '1:2', label: '保守的 (SL 2%, TP 4%)' },
    { sl: 0.025, tp: 0.025, rr: '1:1', label: '対等 (SL 2.5%, TP 2.5%)' },
    { sl: 0.03, tp: 0.015, rr: '2:1', label: '勝率重視 (SL 3%, TP 1.5%)' },
    { sl: 0.04, tp: 0.01, rr: '4:1', label: '高勝率狙い (SL 4%, TP 1%)' },
  ];
  
  const allResults: Map<string, { trades: number; wins: number; expectancy: number }[]> = new Map();
  
  for (const sym of SYMBOLS) {
    console.log(`[${sym.symbol}] ${sym.name} データ取得中...`);
    const data = await fetchRealData(sym.symbol);
    console.log(`  データ: ${data.length}日分\n`);
    
    for (const config of configs) {
      const { trades, winRate, expectancy } = runBacktest(data, config.sl, config.tp);
      
      if (!allResults.has(config.label)) {
        allResults.set(config.label, []);
      }
      
      allResults.get(config.label)!.push({
        trades: trades.length,
        wins: trades.filter(t => t.isWin).length,
        expectancy,
      });
    }
  }
  
  console.log('========================================');
  console.log('結果比較');
  console.log('========================================\n');
  
  console.log('| 条件 | RR比 | 総取引 | 勝数 | 勝率 | 期待値 | 目標達成 |');
  console.log('|------|------|--------|------|------|--------|----------|');
  
  for (const config of configs) {
    const results = allResults.get(config.label) || [];
    const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
    const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
    const avgExpectancy = results.reduce((sum, r) => sum + r.expectancy, 0) / results.length;
    const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
    const achieved = winRate >= 0.6 && avgExpectancy > 0;
    
    console.log(
      `| ${config.label} | ${config.rr} | ${totalTrades} | ${totalWins} | ${(winRate * 100).toFixed(1)}% | ${(avgExpectancy * 100).toFixed(2)}% | ${achieved ? '✅' : '❌'} |`
    );
  }
  
  console.log('\n========================================');
  console.log('理論値');
  console.log('========================================');
  console.log('勝率50%の場合（シグナル精度と仮定）:');
  for (const config of configs) {
    const slRatio = config.tp / config.sl;
    const theoreticalWR = 1 / (1 + slRatio);
    console.log(`  ${config.label}: 理論勝率 ${(theoreticalWR * 100).toFixed(1)}%`);
  }
}

main().catch(console.error);
