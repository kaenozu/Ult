import YahooFinance from 'yahoo-finance2';
import type { OHLCV } from '../app/types';

const yf = new YahooFinance();

interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  type: 'BUY' | 'SELL';
  pnlPercent: number;
  isWin: boolean;
}

function calculateSMA(closes: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(0);
    } else {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateEMA(closes: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sum += closes[i];
      ema.push(0);
    } else if (i === period - 1) {
      sum += closes[i];
      ema.push(sum / period);
    } else {
      ema.push((closes[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  return ema;
}

async function runBacktest(symbol: string, name: string) {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);

  const result = await yf.chart(symbol, {
    period1: startDate.toISOString().split('T')[0],
    interval: '1d'
  });

  if (!result?.quotes?.length) return null;

  const ohlcv: OHLCV[] = result.quotes
    .filter(q => q.close !== null)
    .map(q => ({
      date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
      open: q.open!,
      high: q.high!,
      low: q.low!,
      close: q.close!,
      volume: q.volume || 0
    }));

  const closes = ohlcv.map(d => d.close);
  
  // EMA戦略
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  
  const trades: Trade[] = [];
  const stopLossPercent = 1.5;
  const takeProfitPercent = 6;
  const maxHoldingDays = 20;

  for (let i = 21; i < ohlcv.length - maxHoldingDays; i++) {
    const currentPrice = ohlcv[i].close;
    const prevEma9 = ema9[i - 1];
    const prevEma21 = ema21[i - 1];
    const currEma9 = ema9[i];
    const currEma21 = ema21[i];

    if (isNaN(currEma9) || isNaN(currEma21)) continue;

    let signalType: 'BUY' | 'SELL' | null = null;

    // ゴールデンクロス
    if (prevEma9 <= prevEma21 && currEma9 > currEma21) {
      signalType = 'BUY';
    }
    // デッドクロス
    if (prevEma9 >= prevEma21 && currEma9 < currEma21) {
      signalType = 'SELL';
    }

    if (!signalType) continue;

    let exitPrice = currentPrice;
    let exitDay = i + 1;

    for (let j = i + 1; j < Math.min(i + maxHoldingDays, ohlcv.length); j++) {
      const dayHigh = ohlcv[j].high;
      const dayLow = ohlcv[j].low;

      if (signalType === 'BUY') {
        const stopLoss = currentPrice * (1 - stopLossPercent / 100);
        const takeProfit = currentPrice * (1 + takeProfitPercent / 100);

        if (dayLow <= stopLoss) {
          exitPrice = stopLoss;
          exitDay = j;
          break;
        }
        if (dayHigh >= takeProfit) {
          exitPrice = takeProfit;
          exitDay = j;
          break;
        }
      } else {
        const stopLoss = currentPrice * (1 + stopLossPercent / 100);
        const takeProfit = currentPrice * (1 - takeProfitPercent / 100);

        if (dayHigh >= stopLoss) {
          exitPrice = stopLoss;
          exitDay = j;
          break;
        }
        if (dayLow <= takeProfit) {
          exitPrice = takeProfit;
          exitDay = j;
          break;
        }
      }

      exitPrice = ohlcv[j].close;
      exitDay = j;
    }

    const pnlPercent = signalType === 'BUY'
      ? ((exitPrice - currentPrice) / currentPrice) * 100
      : ((currentPrice - exitPrice) / currentPrice) * 100;

    trades.push({
      entryDate: ohlcv[i].date,
      entryPrice: currentPrice,
      exitDate: ohlcv[exitDay].date,
      exitPrice,
      type: signalType,
      pnlPercent,
      isWin: pnlPercent > 0
    });
  }

  const wins = trades.filter(t => t.isWin).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const avgPnL = trades.length > 0
    ? trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length
    : 0;

  return { symbol, name, trades: trades.length, winRate, avgPnL };
}

async function main() {
  console.log('========================================');
  console.log('EMAクロス戦略 (9/21) バックテスト');
  console.log('========================================\n');

  const symbols = [
    { symbol: '7203.T', name: 'トヨタ' },
    { symbol: '6758.T', name: 'ソニー' },
    { symbol: '9984.T', name: 'ソフトバンク' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'GOOGL', name: 'Google' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: '9104.T', name: '商船三井' },
    { symbol: '8306.T', name: '三菱UFJ' },
    { symbol: '4502.T', name: '武田薬品' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'NFLX', name: 'Netflix' },
    { symbol: 'META', name: 'Meta' },
    { symbol: 'AMD', name: 'AMD' },
  ];

  const results: { symbol: string; name: string; trades: number; winRate: number; avgPnL: number }[] = [];

  for (const { symbol, name } of symbols) {
    process.stdout.write(`[${symbol}] ${name}... `);
    
    try {
      const result = await runBacktest(symbol, name);
      if (result) {
        results.push(result);
        const emoji = result.avgPnL > 0 ? '✅' : '❌';
        console.log(`${result.trades}取引, 勝率${result.winRate.toFixed(1)}%, 期待値${result.avgPnL >= 0 ? '+' : ''}${result.avgPnL.toFixed(2)}% ${emoji}`);
      } else {
        console.log('データなし');
      }
    } catch (e) {
      console.log('エラー');
    }
  }

  console.log('\n========================================');
  console.log('推奨銘柄（期待値プラス）');
  console.log('========================================\n');

  const positive = results.filter(r => r.avgPnL > 0).sort((a, b) => b.avgPnL - a.avgPnL);

  if (positive.length === 0) {
    console.log('期待値プラスの銘柄がありません');
  } else {
    console.log('| 銘柄 | 取引数 | 勝率 | 期待値 |');
    console.log('|------|--------|------|--------|');
    for (const r of positive) {
      console.log(`| ${r.name} | ${r.trades} | ${r.winRate.toFixed(1)}% | +${r.avgPnL.toFixed(2)}% |`);
    }

    const avgWinRate = positive.reduce((s, r) => s + r.winRate, 0) / positive.length;
    const avgExpectancy = positive.reduce((s, r) => s + r.avgPnL, 0) / positive.length;

    console.log('|------|--------|------|--------|');
    console.log(`| 平均 | - | ${avgWinRate.toFixed(1)}% | +${avgExpectancy.toFixed(2)}% |`);

    console.log(`\n推奨銘柄数: ${positive.length} / ${results.length}`);
  }
}

main().catch(console.error);
