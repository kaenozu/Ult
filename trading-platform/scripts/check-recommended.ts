import YahooFinance from 'yahoo-finance2';
import { ConsensusSignalService } from '../app/lib/ConsensusSignalService';
import { filterForBeginner } from '../app/lib/services/beginner-signal-filter';
import { DEFAULT_BEGINNER_CONFIG } from '../app/types/beginner-signal';
import type { OHLCV } from '../app/types';

const yf = new YahooFinance();
const signalService = new ConsensusSignalService();

const ALL_SYMBOLS = [
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
  { symbol: '6861.T', name: 'キーエンス' },
  { symbol: '6902.T', name: 'デンソー' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NFLX', name: 'Netflix' },
  { symbol: '4519.T', name: '中外製薬' },
  { symbol: '4063.T', name: '信越化学' },
  { symbol: '6981.T', name: '村田製作所' },
  { symbol: '7201.T', name: '日産自動車' },
  { symbol: '7267.T', name: 'ホンダ' },
  { symbol: '8411.T', name: 'みずほ' },
  { symbol: 'ORCL', name: 'Oracle' },
  { symbol: 'CRM', name: 'Salesforce' },
  { symbol: 'AMD', name: 'AMD' },
  { symbol: 'INTC', name: 'Intel' },
  { symbol: 'DIS', name: 'Disney' },
  { symbol: 'BA', name: 'Boeing' },
  { symbol: 'V', name: 'Visa' },
  { symbol: 'JPM', name: 'JPMorgan' },
];

interface BacktestTrade {
  pnlPercent: number;
  confidence: number;
  indicatorCount: number;
  isWin: boolean;
  hitStopLoss: boolean;
  hitTakeProfit: boolean;
}

async function fetchOHLCV(symbol: string): Promise<OHLCV[]> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);
  
  const result = await yf.chart(symbol, { 
    period1: startDate.toISOString().split('T')[0], 
    interval: '1d' 
  });
  
  if (!result?.quotes?.length) return [];
  
  return result.quotes
    .filter(q => q.close !== null && q.open !== null && q.high !== null && q.low !== null)
    .map(q => ({
      date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
      open: q.open!,
      high: q.high!,
      low: q.low!,
      close: q.close!,
      volume: q.volume || 0
    }));
}

async function runQuickBacktest(symbol: string, ohlcv: OHLCV[]): Promise<{ expectancy: number; trades: number; winRate: number }> {
  const trades: BacktestTrade[] = [];
  const lookbackPeriod = 50;
  const maxHoldingDays = 20;
  
  for (let i = lookbackPeriod; i < ohlcv.length - maxHoldingDays; i++) {
    const historicalData = ohlcv.slice(i - lookbackPeriod, i);
    const currentPrice = ohlcv[i].close;
    
    try {
      const signal = signalService.generateConsensus(historicalData);
      
      if (!signal || signal.type === 'HOLD') continue;
      if (signal.confidence < DEFAULT_BEGINNER_CONFIG.confidenceThreshold) continue;
      
      let exitPrice = currentPrice;
      let hitStopLoss = false;
      let hitTakeProfit = false;
      
      for (let j = i + 1; j < Math.min(i + maxHoldingDays, ohlcv.length); j++) {
        const dayHigh = ohlcv[j].high;
        const dayLow = ohlcv[j].low;
        
        if (signal.type === 'BUY') {
          const stopLossPrice = currentPrice * 0.985;
          const takeProfitPrice = currentPrice * 1.06;
          
          if (dayLow <= stopLossPrice) {
            exitPrice = stopLossPrice;
            hitStopLoss = true;
            break;
          }
          if (dayHigh >= takeProfitPrice) {
            exitPrice = takeProfitPrice;
            hitTakeProfit = true;
            break;
          }
        } else {
          const stopLossPrice = currentPrice * 1.015;
          const takeProfitPrice = currentPrice * 0.94;
          
          if (dayHigh >= stopLossPrice) {
            exitPrice = stopLossPrice;
            hitStopLoss = true;
            break;
          }
          if (dayLow <= takeProfitPrice) {
            exitPrice = takeProfitPrice;
            hitTakeProfit = true;
            break;
          }
        }
        
        exitPrice = ohlcv[j].close;
      }
      
      const pnlPercent = signal.type === 'BUY'
        ? ((exitPrice - currentPrice) / currentPrice) * 100
        : ((currentPrice - exitPrice) / currentPrice) * 100;
      
      trades.push({
        pnlPercent,
        confidence: signal.confidence,
        indicatorCount: signal.indicatorCount ?? 0,
        isWin: pnlPercent > 0,
        hitStopLoss,
        hitTakeProfit
      });
    } catch {
      continue;
    }
  }
  
  if (trades.length === 0) return { expectancy: 0, trades: 0, winRate: 0 };
  
  const wins = trades.filter(t => t.isWin).length;
  const winRate = wins / trades.length;
  
  const winTrades = trades.filter(t => t.isWin);
  const lossTrades = trades.filter(t => !t.isWin);
  
  const avgWin = winTrades.length > 0 
    ? winTrades.reduce((s, t) => s + t.pnlPercent, 0) / winTrades.length 
    : 0;
  const avgLoss = lossTrades.length > 0
    ? lossTrades.reduce((s, t) => s + t.pnlPercent, 0) / lossTrades.length
    : 0;
  
  const expectancy = (winRate * avgWin) + ((1 - winRate) * avgLoss);
  
  return { expectancy, trades: trades.length, winRate: winRate * 100 };
}

async function getCurrentSignal(symbol: string, ohlcv: OHLCV[]) {
  const consensus = signalService.generateConsensus(ohlcv);
  const signal = signalService.convertToSignal(consensus, symbol, ohlcv);
  const beginner = filterForBeginner(signal, ohlcv[ohlcv.length - 1].close, DEFAULT_BEGINNER_CONFIG);
  
  return {
    symbol,
    price: ohlcv[ohlcv.length - 1].close,
    consensus,
    beginner
  };
}

async function main() {
  console.log('========================================');
  console.log('推奨銘柄の計算中...');
  console.log('========================================\n');
  
  const candidates: { symbol: string; name: string; expectancy: number; trades: number; winRate: number; ohlcv: OHLCV[] }[] = [];
  
  for (const { symbol, name } of ALL_SYMBOLS) {
    process.stdout.write(`[${symbol}] ${name}... `);
    
    try {
      const ohlcv = await fetchOHLCV(symbol);
      if (ohlcv.length < 100) {
        console.log('データ不足');
        continue;
      }
      
      const { expectancy, trades, winRate } = await runQuickBacktest(symbol, ohlcv);
      
      if (expectancy > 0 && trades >= 3) {
        candidates.push({ symbol, name, expectancy, trades, winRate, ohlcv });
        console.log(`期待値 +${expectancy.toFixed(2)}% (${trades}回, 勝率${winRate.toFixed(1)}%) ✅`);
      } else {
        console.log(`期待値 ${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}% (${trades}回)`);
      }
    } catch (e) {
      console.log('エラー');
    }
  }
  
  candidates.sort((a, b) => b.expectancy - a.expectancy);
  
  console.log('\n========================================');
  console.log(`推奨銘柄（期待値プラス）: ${candidates.length}銘柄 / ${ALL_SYMBOLS.length}銘柄中`);
  console.log('========================================\n');
  
  if (candidates.length === 0) {
    console.log('期待値プラスの銘柄がありません');
    console.log('\n推奨: リスクリワード比1:4を守ることで、勝率23%でも期待値プラスになります');
    return;
  }
  
  const actionable: { name: string; expectancy: number; action: string; price: number; stopLoss?: number; takeProfit?: number }[] = [];
  const waiting: { name: string; expectancy: number; price: number }[] = [];
  
  for (const c of candidates) {
    const result = await getCurrentSignal(c.symbol, c.ohlcv);
    
    if (result.beginner.action !== 'WAIT') {
      actionable.push({
        name: c.name,
        expectancy: c.expectancy,
        action: result.beginner.action,
        price: result.price,
        stopLoss: result.beginner.autoRisk?.stopLossPrice,
        takeProfit: result.beginner.autoRisk?.takeProfitPrice
      });
    } else {
      waiting.push({
        name: c.name,
        expectancy: c.expectancy,
        price: result.price
      });
    }
  }
  
  if (actionable.length > 0) {
    console.log('=== アクション可能 ===\n');
    console.log('| 銘柄 | 期待値 | アクション | 価格 | 損切り | 利確 |');
    console.log('|------|--------|------------|------|--------|------|');
    for (const s of actionable) {
      console.log(`| ${s.name} | +${s.expectancy.toFixed(2)}% | ${s.action} | ${s.price.toFixed(2)} | ${s.stopLoss?.toFixed(2) || '-'} | ${s.takeProfit?.toFixed(2) || '-'} |`);
    }
  }
  
  if (waiting.length > 0) {
    console.log('\n=== 様子見 ===\n');
    console.log('| 銘柄 | 期待値 | 価格 |');
    console.log('|------|--------|------|');
    for (const s of waiting) {
      console.log(`| ${s.name} | +${s.expectancy.toFixed(2)}% | ${s.price.toFixed(2)} |`);
    }
  }
  
  console.log('\n========================================');
  console.log(`推奨銘柄数: ${candidates.length} / ${ALL_SYMBOLS.length}`);
  console.log('========================================');
}

main().catch(console.error);
