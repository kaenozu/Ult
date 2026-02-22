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

function calculateRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }

    const change = closes[i] - closes[i - 1];
    
    if (i < period) {
      if (change > 0) gains += change;
      else losses -= change;
      result.push(50);
    } else if (i === period) {
      if (change > 0) gains += change;
      else losses -= change;
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      const avgGain = (gains * (period - 1) + Math.max(0, change)) / period;
      const avgLoss = (losses * (period - 1) + Math.max(0, -change)) / period;
      gains = avgGain;
      losses = avgLoss;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
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

function runBacktest(
  data: OHLCV[],
  strategy: 'rsi_reversal' | 'rsi_momentum' | 'ema_cross' | 'sma_cross' | 'price_momentum',
  stopLossPercent: number,
  takeProfitPercent: number
): { trades: Trade[]; winRate: number; expectancy: number } {
  const trades: Trade[] = [];
  const fee = 0.002;
  
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const sma10 = calculateSMA(closes, 10);
  const sma30 = calculateSMA(closes, 30);
  
  let position: { entryPrice: number; type: 'BUY' | 'SELL' } | null = null;
  let prevSignal: 'BUY' | 'SELL' | null = null;
  
  for (let i = 50; i < data.length; i++) {
    const current = data[i];
    let signal: 'BUY' | 'SELL' | null = null;
    
    switch (strategy) {
      case 'rsi_reversal':
        if (rsi[i] < 30) signal = 'BUY';
        else if (rsi[i] > 70) signal = 'SELL';
        break;
        
      case 'rsi_momentum':
        if (rsi[i] > 50 && rsi[i - 1] <= 50) signal = 'BUY';
        else if (rsi[i] < 50 && rsi[i - 1] >= 50) signal = 'SELL';
        break;
        
      case 'ema_cross':
        if (ema9[i] > ema21[i] && ema9[i - 1] <= ema21[i - 1]) signal = 'BUY';
        else if (ema9[i] < ema21[i] && ema9[i - 1] >= ema21[i - 1]) signal = 'SELL';
        break;
        
      case 'sma_cross':
        if (sma10[i] > sma30[i] && sma10[i - 1] <= sma30[i - 1]) signal = 'BUY';
        else if (sma10[i] < sma30[i] && sma10[i - 1] >= sma30[i - 1]) signal = 'SELL';
        break;
        
      case 'price_momentum':
        const momentum = (closes[i] - closes[i - 5]) / closes[i - 5];
        if (momentum > 0.02) signal = 'BUY';
        else if (momentum < -0.02) signal = 'SELL';
        break;
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
  console.log('単一指標戦略 比較テスト');
  console.log('========================================\n');
  
  const strategies = [
    { type: 'rsi_reversal' as const, label: 'RSI逆張り (30/70)' },
    { type: 'rsi_momentum' as const, label: 'RSIモメンタム (50クロス)' },
    { type: 'ema_cross' as const, label: 'EMAクロス (9/21)' },
    { type: 'sma_cross' as const, label: 'SMAクロス (10/30)' },
    { type: 'price_momentum' as const, label: '価格モメンタム (5日)' },
  ];
  
  const allResults: Map<string, { trades: number; wins: number; expectancy: number }[]> = new Map();
  
  for (const sym of SYMBOLS) {
    console.log(`[${sym.symbol}] ${sym.name} データ取得中...`);
    const data = await fetchRealData(sym.symbol);
    console.log(`  データ: ${data.length}日分\n`);
    
    for (const strat of strategies) {
      const { trades, winRate, expectancy } = runBacktest(data, strat.type, 0.015, 0.06);
      
      if (!allResults.has(strat.label)) {
        allResults.set(strat.label, []);
      }
      
      allResults.get(strat.label)!.push({
        trades: trades.length,
        wins: trades.filter(t => t.isWin).length,
        expectancy,
      });
    }
  }
  
  console.log('========================================');
  console.log('結果比較 (SL 1.5%, TP 6%)');
  console.log('========================================\n');
  
  console.log('| 戦略 | 総取引 | 勝数 | 勝率 | 期待値 |');
  console.log('|------|--------|------|------|--------|');
  
  for (const strat of strategies) {
    const results = allResults.get(strat.label) || [];
    const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
    const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
    const avgExpectancy = results.reduce((sum, r) => sum + r.expectancy, 0) / results.length;
    const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
    
    console.log(
      `| ${strat.label} | ${totalTrades} | ${totalWins} | ${(winRate * 100).toFixed(1)}% | ${(avgExpectancy * 100).toFixed(2)}% |`
    );
  }
}

main().catch(console.error);
