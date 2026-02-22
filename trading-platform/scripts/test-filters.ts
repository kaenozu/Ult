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
  stopLossPercent: number,
  takeProfitPercent: number,
  filterType: 'none' | 'adx' | 'volume' | 'trend' | 'all'
): { trades: Trade[]; winRate: number; expectancy: number } {
  const service = new ConsensusSignalService();
  const trades: Trade[] = [];
  const fee = 0.002;
  
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const rsi = calculateRSI(closes);
  const adx = calculateADX(highs, lows, closes);
  const avgVolume = calculateSMA(volumes, 20);
  
  let position: { entryPrice: number; type: 'BUY' | 'SELL' } | null = null;
  
  const originalLog = console.log;
  console.log = () => {};
  
  for (let i = 200; i < data.length; i++) {
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
      let allowed = true;
      
      if (filterType === 'adx' || filterType === 'all') {
        if (adx[i] < 25) allowed = false;
      }
      
      if (filterType === 'volume' || filterType === 'all') {
        if (volumes[i] < avgVolume[i] * 1.2) allowed = false;
      }
      
      if (filterType === 'trend' || filterType === 'all') {
        if (consensus.type === 'BUY' && closes[i] < sma50[i]) allowed = false;
        if (consensus.type === 'SELL' && closes[i] > sma50[i]) allowed = false;
      }
      
      if (allowed) {
        position = {
          entryPrice: current.close,
          type: consensus.type === 'BUY' ? 'BUY' : 'SELL',
        };
      }
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
  console.log('フィルター別 シグナル精度検証');
  console.log('========================================\n');
  
  const filters = [
    { type: 'none' as const, label: 'フィルターなし' },
    { type: 'adx' as const, label: 'ADX>25 (トレンド確認)' },
    { type: 'volume' as const, label: '出来高増加' },
    { type: 'trend' as const, label: 'SMA50トレンド確認' },
    { type: 'all' as const, label: '全フィルター適用' },
  ];
  
  const allResults: Map<string, { trades: number; wins: number; expectancy: number }[]> = new Map();
  
  for (const sym of SYMBOLS) {
    console.log(`[${sym.symbol}] ${sym.name} データ取得中...`);
    const data = await fetchRealData(sym.symbol);
    console.log(`  データ: ${data.length}日分\n`);
    
    for (const filter of filters) {
      const { trades, winRate, expectancy } = runBacktest(data, 0.015, 0.06, filter.type);
      
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
  
  console.log('========================================');
  console.log('結果比較 (SL 1.5%, TP 6%)');
  console.log('========================================\n');
  
  console.log('| フィルター | 総取引 | 勝数 | 勝率 | 期待値 |');
  console.log('|------------|--------|------|------|--------|');
  
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
