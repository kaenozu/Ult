import YahooFinance from 'yahoo-finance2';
import { emaCrossStrategy } from '../app/lib/services/ema-cross-strategy';
import { RECOMMENDED_SYMBOLS, BEGINNER_SYMBOLS } from '../app/constants/recommended-symbols';
import type { OHLCV } from '../app/types';

const yf = new YahooFinance();

async function fetchRealData(symbol: string): Promise<OHLCV[]> {
  const result = await yf.chart(symbol, {
    period1: '2023-01-01',
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

interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  type: 'BUY' | 'SELL';
  confidence: number;
  pnlPercent: number;
  isWin: boolean;
  hitStopLoss: boolean;
  hitTakeProfit: boolean;
}

function runBacktest(
  data: OHLCV[],
  stopLossPercent: number,
  takeProfitPercent: number
): { trades: Trade[]; winRate: number; expectancy: number } {
  const trades: Trade[] = [];
  const fee = 0.002;
  
  let position: { entryIdx: number; entryPrice: number; type: 'BUY' | 'SELL'; confidence: number } | null = null;
  let prevType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  
  for (let i = 100; i < data.length; i++) {
    const slice = data.slice(0, i + 1);
    const signal = emaCrossStrategy.generateSignal(slice);
    const current = data[i];
    
    if (position) {
      const pnlPercent = position.type === 'BUY'
        ? (current.close - position.entryPrice) / position.entryPrice
        : (position.entryPrice - current.close) / position.entryPrice;
      
      const hitStopLoss = pnlPercent <= -stopLossPercent;
      const hitTakeProfit = pnlPercent >= takeProfitPercent;
      
      if (hitStopLoss || hitTakeProfit) {
        const pnlAfterFees = pnlPercent - (pnlPercent > 0 ? fee : fee * 2);
        const entryDate = new Date(data[position.entryIdx].timestamp * 1000).toISOString().split('T')[0];
        const exitDate = new Date(current.timestamp * 1000).toISOString().split('T')[0];
        
        trades.push({
          entryDate,
          entryPrice: position.entryPrice,
          exitDate,
          exitPrice: current.close,
          type: position.type,
          confidence: position.confidence,
          pnlPercent: pnlAfterFees,
          isWin: pnlAfterFees > 0,
          hitStopLoss,
          hitTakeProfit,
        });
        position = null;
      }
    }
    
    if (signal.type !== 'HOLD' && signal.type !== prevType && !position) {
      position = {
        entryIdx: i,
        entryPrice: current.close,
        type: signal.type,
        confidence: signal.confidence,
      };
      prevType = signal.type;
    }
  }
  
  if (trades.length === 0) return { trades: [], winRate: 0, expectancy: 0 };
  
  const wins = trades.filter(t => t.isWin).length;
  const winRate = wins / trades.length;
  const expectancy = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length;
  
  return { trades, winRate, expectancy };
}

async function main() {
  console.log('========================================');
  console.log('実装検証: EMA Cross Strategy');
  console.log('========================================\n');
  
  const symbols = RECOMMENDED_SYMBOLS.map(s => s.symbol);
  const results: { symbol: string; trades: number; wins: number; winRate: number; expectancy: number }[] = [];
  
  for (const sym of symbols) {
    process.stdout.write(`[${sym}] 取得中...`);
    const data = await fetchRealData(sym);
    
    if (data.length < 100) {
      console.log(' データ不足');
      continue;
    }
    
    const result = runBacktest(data, 0.015, 0.06);
    results.push({
      symbol: sym,
      trades: result.trades.length,
      wins: result.trades.filter(t => t.isWin).length,
      winRate: result.winRate,
      expectancy: result.expectancy,
    });
    console.log(` 取引${result.trades.length}回, 勝率${(result.winRate * 100).toFixed(1)}%`);
  }
  
  console.log('\n========================================');
  console.log('結果サマリー');
  console.log('========================================\n');
  
  const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
  const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
  const avgExpectancy = results.reduce((sum, r) => sum + r.expectancy, 0) / results.length;
  const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
  
  console.log(`総取引: ${totalTrades}`);
  console.log(`勝率: ${(winRate * 100).toFixed(1)}%`);
  console.log(`期待値: ${(avgExpectancy * 100).toFixed(2)}%`);
  
  console.log('\n========================================');
  console.log('銘柄別詳細');
  console.log('========================================\n');
  
  console.log('| 銘柄 | 取引 | 勝数 | 勝率 | 期待値 |');
  console.log('|------|------|------|------|--------|');
  
  for (const r of results.sort((a, b) => b.expectancy - a.expectancy)) {
    console.log(
      `| ${r.symbol} | ${r.trades} | ${r.wins} | ${(r.winRate * 100).toFixed(1)}% | ${(r.expectancy * 100).toFixed(2)}% |`
    );
  }
  
  const good = results.filter(r => r.winRate >= 0.5 && r.expectancy > 0);
  if (good.length > 0) {
    const goodTrades = good.reduce((sum, r) => sum + r.trades, 0);
    const goodWins = good.reduce((sum, r) => sum + r.wins, 0);
    const goodWR = goodTrades > 0 ? goodWins / goodTrades : 0;
    const goodExp = good.reduce((sum, r) => sum + r.expectancy, 0) / good.length;
    
    console.log(`\n========================================`);
    console.log(`勝率50%+ & 期待値プラス: ${good.length}銘柄`);
    console.log(`========================================`);
    console.log(`取引: ${goodTrades}`);
    console.log(`勝率: ${(goodWR * 100).toFixed(1)}%`);
    console.log(`期待値: ${(goodExp * 100).toFixed(2)}%`);
  }
  
  console.log('\n========================================');
  console.log('初心者向け銘柄');
  console.log('========================================\n');
  
  for (const sym of BEGINNER_SYMBOLS) {
    const r = results.find(x => x.symbol === sym.symbol);
    if (r) {
      console.log(`${sym.symbol} ($${sym.minInvestment}〜): 勝率${(r.winRate * 100).toFixed(1)}%, 期待値${(r.expectancy * 100).toFixed(2)}%`);
    }
  }
}

main().catch(console.error);
