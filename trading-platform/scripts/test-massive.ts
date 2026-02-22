import YahooFinance from 'yahoo-finance2';
import type { OHLCV } from '../app/types';

const yf = new YahooFinance();

const SYMBOLS = [
  'SPY', 'QQQ', 'IWM', 'DIA',
  'NFLX', 'GOOGL', 'AAPL', 'MSFT', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'ORCL',
  'INTC', 'CRM', 'DIS', 'BA', 'V', 'JPM', 'WMT', 'PG', 'KO', 'PEP',
  'COST', 'NKE', 'MCD', 'SBUX', 'TGT', 'HD', 'LOW', 'CVX', 'XOM', 'COP',
  'BAC', 'GS', 'MS', 'C', 'WFC', 'USB', 'PNC', 'BLK', 'SCHW',
  'UNH', 'JNJ', 'PFE', 'MRK', 'LLY', 'ABBV', 'TMO', 'ABT', 'DHR', 'BMY',
  'LIN', 'APD', 'SHW', 'CAT', 'DE', 'GE', 'HON', 'UPS', 'FDX', 'RTX',
];

interface Trade {
  pnlPercent: number;
  isWin: boolean;
}

async function fetchRealData(symbol: string): Promise<OHLCV[]> {
  try {
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
  } catch {
    return [];
  }
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
  adxThreshold: number,
  stopLossPercent: number,
  takeProfitPercent: number
): { trades: number; wins: number; winRate: number; expectancy: number } {
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
    
    if ((crossUp || crossDown) && adx[i] >= adxThreshold) {
      if (crossUp && closes[i] >= sma50[i]) signal = 'BUY';
      if (crossDown && closes[i] <= sma50[i]) signal = 'SELL';
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
  
  if (trades.length === 0) return { trades: 0, wins: 0, winRate: 0, expectancy: 0 };
  
  const wins = trades.filter(t => t.isWin).length;
  const winRate = wins / trades.length;
  const expectancy = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length;
  
  return { trades: trades.length, wins, winRate, expectancy };
}

async function main() {
  console.log('========================================');
  console.log('大規模検証 (60銘柄, 2年間)');
  console.log('========================================\n');
  
  console.log('データ取得中...');
  const allData: Map<string, OHLCV[]> = new Map();
  
  for (const symbol of SYMBOLS) {
    const data = await fetchRealData(symbol);
    if (data.length > 100) {
      allData.set(symbol, data);
      process.stdout.write('.');
    }
  }
  
  console.log(`\n\n取得完了: ${allData.size}銘柄\n`);
  
  const adxThresholds = [20, 25, 30, 35];
  
  console.log('| ADX閾値 | 取引 | 勝率 | 期待値 | 目標達成 |');
  console.log('|---------|------|------|--------|----------|');
  
  for (const adxTh of adxThresholds) {
    let totalTrades = 0;
    let totalWins = 0;
    let totalExpectancy = 0;
    let symbolCount = 0;
    
    for (const [symbol, data] of allData) {
      const result = runBacktest(data, adxTh, 0.015, 0.06);
      if (result.trades > 0) {
        totalTrades += result.trades;
        totalWins += result.wins;
        totalExpectancy += result.expectancy;
        symbolCount++;
      }
    }
    
    const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
    const avgExpectancy = symbolCount > 0 ? totalExpectancy / symbolCount : 0;
    const achieved = winRate >= 0.6 && avgExpectancy > 0;
    
    console.log(
      `| ADX>${adxTh} | ${totalTrades} | ${(winRate * 100).toFixed(1)}% | ${(avgExpectancy * 100).toFixed(2)}% | ${achieved ? '✅' : '❌'} |`
    );
  }
  
  console.log('\n========================================');
  console.log('銘柄別分析 (ADX>25)');
  console.log('========================================\n');
  
  const symbolResults: { symbol: string; trades: number; wins: number; winRate: number; expectancy: number }[] = [];
  
  for (const [symbol, data] of allData) {
    const result = runBacktest(data, 25, 0.015, 0.06);
    if (result.trades > 0) {
      symbolResults.push({ symbol, ...result });
    }
  }
  
  const good = symbolResults.filter(r => r.winRate >= 0.5 && r.expectancy > 0);
  console.log(`勝率50%+ & 期待値プラス: ${good.length}銘柄\n`);
  
  if (good.length > 0) {
    console.log('| 銘柄 | 取引 | 勝率 | 期待値 |');
    console.log('|------|------|------|--------|');
    
    for (const r of good.sort((a, b) => b.expectancy - a.expectancy).slice(0, 15)) {
      console.log(`| ${r.symbol} | ${r.trades} | ${(r.winRate * 100).toFixed(1)}% | ${(r.expectancy * 100).toFixed(2)}% |`);
    }
    
    const goodTrades = good.reduce((sum, r) => sum + r.trades, 0);
    const goodWins = good.reduce((sum, r) => sum + r.wins, 0);
    const goodWR = goodTrades > 0 ? goodWins / goodTrades : 0;
    const goodExp = good.reduce((sum, r) => sum + r.expectancy, 0) / good.length;
    
    console.log('\n========================================');
    console.log('推奨銘柄合計');
    console.log('========================================');
    console.log(`銘柄数: ${good.length}`);
    console.log(`取引数: ${goodTrades}`);
    console.log(`勝率: ${(goodWR * 100).toFixed(1)}%`);
    console.log(`期待値: ${(goodExp * 100).toFixed(2)}%`);
  }
}

main().catch(console.error);
