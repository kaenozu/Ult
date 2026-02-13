import { IMarketDataHub } from '../interfaces/IMarketDataHub';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { OHLCV } from '../../types';

export interface ScanResult {
  symbol: string;
  signals: string[];
  score: number;
}

export class AutoScreener {
  constructor(private dataHub: IMarketDataHub) {}

  /**
   * 銘柄リストをスキャンし、チャンスのある銘柄を返す
   */
  async scan(symbols: string[]): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    // Parallel scan
    await Promise.all(symbols.map(async (symbol) => {
      // Determine market (simplified)
      const market = symbol.match(/^[0-9]+$/) ? 'japan' : 'usa';
      
      try {
        const data = await this.dataHub.getData(symbol, market as 'japan' | 'usa');
        if (data.length < 20) return;

        const signals = this.analyze(data);
        if (signals.length > 0) {
          results.push({
            symbol,
            signals,
            score: signals.length * 10, // Simple scoring
          });
        }
      } catch (error) {
        console.error(`Failed to scan ${symbol}:`, error);
      }
    }));

    return results.sort((a, b) => b.score - a.score);
  }

  private analyze(data: OHLCV[]): string[] {
    const signals: string[] = [];
    const closes = data.map(d => d.close);

    // RSI check
    const rsi = technicalIndicatorService.calculateRSI(closes, 14);
    const latestRsi = rsi[rsi.length - 1];
    
    if (latestRsi < 30) signals.push('OVERSOLD');
    if (latestRsi > 70) signals.push('OVERBOUGHT');

    // Simple Trend check
    const sma20 = technicalIndicatorService.calculateSMA(closes, 20);
    const lastPrice = closes[closes.length - 1];
    if (lastPrice > sma20[sma20.length - 1]) {
      signals.push('BULLISH_TREND');
    }

    return signals;
  }
}
