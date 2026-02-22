import YahooFinance from 'yahoo-finance2';
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

function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  
  return result;
}

function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  let plusDM: number[] = [0];
  let minusDM: number[] = [0];
  let tr: number[] = [0];

  for (let i = 1; i < closes.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    const trValue = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    tr.push(trValue);
  }

  for (let i = 0; i < closes.length; i++) {
    if (i < period * 2) {
      result.push(0);
    } else {
      const smoothTR = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const smoothPlusDM = plusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const smoothMinusDM = minusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      const plusDI = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
      const minusDI = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
      
      const dx = plusDI + minusDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
      result.push(dx);
    }
  }

  return result;
}

function runBacktest(
  data: OHLCV[],
  filterType: 'none' | 'adx' | 'trend' | 'both',
  stopLossPercent: number,
  takeProfitPercent: number
): { trades: Trade[]; winRate: number; expectancy: number } {
  const trades: Trade[] = [];
  const fee = 0.002;
  
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const sma50 = calculateSMA(closes, 50);
  const adx = calculateADX(highs, lows, closes);
  
  let position: { entryPrice: number; type: 'BUY' | 'SELL' } | null = null;
  let prevSignal: 'BUY' | 'SELL' | null = null;
  
  for (let i = 60; i < data.length; i++) {
    const current = data[i];
    
    const crossUp = ema9[i - 1] <= ema21[i - 1] && ema9[i] > ema21[i];
    const crossDown = ema9[i - 1] >= ema21[i - 1] && ema9[i] < ema21[i];
    
    let signal: 'BUY' | 'SELL' | null = null;
    
    if (crossUp || crossDown) {
      let allowed = true;
      
      if (filterType === 'adx' || filterType === 'both') {
        if (adx[i] < 25) allowed = false;
      }
      
      if (filterType === 'trend' || filterType === 'both') {
        if (crossUp && closes[i] < sma50[i]) allowed = false;
        if (crossDown && closes[i] > sma50[i]) allowed = false;
      }
      
      if (allowed) {
        signal = crossUp ? 'BUY' : 'SELL';
      }
    }
    
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
    }
    
    if (signal && signal !== prevSignal && !position) {
      position = {
        entryPrice: current.close,
        type: signal,
      };
      prevSignal = signal;
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
  console.log('トレンドフィルター付きEMAクロス検証');
  console.log('========================================\n');
  
  const filters = [
    { type: 'none' as const, label: 'フィルターなし' },
    { type: 'adx' as const, label: 'ADX>25のみ' },
    { type: 'trend' as const, label: 'SMA50トレンド確認' },
    { type: 'both' as const, label: 'ADX+SMA50両方' },
  ];
  
  const allResults: Map<string, { trades: number; wins: number; expectancy: number }[]> = new Map();
  
  for (const sym of SYMBOLS) {
    console.log(`[${sym.symbol}] ${sym.name} データ取得中...`);
    const data = await fetchRealData(sym.symbol);
    console.log(`  データ: ${data.length}日分`);
    
    for (const filter of filters) {
      const { trades, winRate, expectancy } = runBacktest(data, filter.type, 0.015, 0.06);
      
      if (!allResults.has(filter.label)) {
        allResults.set(filter.label, []);
      }
      
      allResults.get(filter.label)!.push({
        trades: trades.length,
        wins: trades.filter(t => t.isWin).length,
        expectancy,
      });
    }
  }
  
  console.log('\n========================================');
  console.log('結果 (SL 1.5%, TP 6%)');
  console.log('========================================\n');
  
  console.log('| フィルター | 取引 | 勝数 | 勝率 | 期待値 |');
  console.log('|------------|------|------|------|--------|');
  
  for (const filter of filters) {
    const results = allResults.get(filter.label) || [];
    const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
    const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
    const avgExpectancy = results.reduce((sum, r) => sum + r.expectancy, 0) / results.length;
    const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
    
    console.log(
      `| ${filter.label} | ${totalTrades} | ${totalWins} | ${(winRate * 100).toFixed(1)}% | ${(avgExpectancy * 100).toFixed(2)}% |`
    );
  }
}

main().catch(console.error);
