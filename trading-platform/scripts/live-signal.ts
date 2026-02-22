import YahooFinance from 'yahoo-finance2';
import { ConsensusSignalService } from '../app/lib/ConsensusSignalService';
import { filterForBeginner } from '../app/lib/services/beginner-signal-filter';
import { DEFAULT_BEGINNER_CONFIG } from '../app/types/beginner-signal';

const yf = new YahooFinance();
const signalService = new ConsensusSignalService();

const TARGET_SYMBOLS = [
  { symbol: 'NFLX', name: 'Netflix' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: '9984.T', name: 'ソフトバンク' },
];

async function getCurrentSignal(symbol: string, name: string) {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  
  const result = await yf.chart(symbol, { 
    period1: startDate.toISOString().split('T')[0], 
    interval: '1d' 
  });
  
  if (!result?.quotes?.length) return null;

  const ohlcv = result.quotes
    .filter(q => q.close !== null)
    .map(q => ({
      date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
      open: q.open!,
      high: q.high!,
      low: q.low!,
      close: q.close!,
      volume: q.volume || 0
    }));

  const consensus = signalService.generateConsensus(ohlcv);
  const signal = signalService.convertToSignal(consensus, symbol, ohlcv);
  const beginner = filterForBeginner(signal, ohlcv[ohlcv.length - 1].close, DEFAULT_BEGINNER_CONFIG);
  
  return {
    symbol,
    name,
    price: ohlcv[ohlcv.length - 1].close,
    consensus,
    beginner
  };
}

async function main() {
  console.log('========================================');
  console.log('現金取引 - 推奨銘柄シグナル確認');
  console.log('========================================\n');

  for (const { symbol, name } of TARGET_SYMBOLS) {
    console.log(`\n[${symbol}] ${name}`);
    
    try {
      const result = await getCurrentSignal(symbol, name);
      
      if (!result) {
        console.log('  データ取得失敗');
        continue;
      }

      console.log(`  現在価格: ${result.price.toFixed(2)}`);
      console.log(`  信頼度: ${result.consensus.confidence.toFixed(1)}%`);
      
      if (result.beginner.action !== 'WAIT' && result.beginner.autoRisk) {
        console.log(`\n  === 取引指示 ===`);
        console.log(`  アクション: ${result.beginner.action}`);
        console.log(`  エントリー: ${result.price.toFixed(2)}`);
        console.log(`  損切り: ${result.beginner.autoRisk.stopLossPrice.toFixed(2)} (-1.5%)`);
        console.log(`  利確: ${result.beginner.autoRisk.takeProfitPrice.toFixed(2)} (+6%)`);
        console.log(`  理由: ${result.beginner.reason}`);
      } else {
        console.log(`  判定: 様子見`);
        console.log(`  理由: ${result.beginner.reason}`);
      }
    } catch (e) {
      console.log('  エラー');
    }
  }

  console.log('\n========================================');
  console.log('注意: これは投資助言ではありません');
  console.log('========================================');
}

main().catch(console.error);
