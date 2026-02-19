import { IMarketDataHub } from '../interfaces/IMarketDataHub';
import { devError } from '@/app/lib/utils/dev-logger';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { OHLCV } from '../../types';
<<<<<<< HEAD
import { devLog, devWarn, devError } from '@/app/lib/utils/logger';
=======

>>>>>>> origin/main

export interface ScanResult {
  symbol: string;
  signals: string[];
  score: number;
}

export interface ScreenerConfig {
  rsiOversold: number;
  rsiOverbought: number;
  rsiPeriod: number;
  smaPeriod: number;
  maxSymbols: number;
  batchSize: number;
}

const DEFAULT_CONFIG: ScreenerConfig = {
  rsiOversold: 30,
  rsiOverbought: 70,
  rsiPeriod: 14,
  smaPeriod: 20,
  maxSymbols: 100, // DoS prevention: limit total symbols per scan
  batchSize: 5,    // DoS prevention: limit concurrent requests
};

export class AutoScreener {
  private config: ScreenerConfig;

  constructor(private dataHub: IMarketDataHub, config?: Partial<ScreenerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 銘柄リストをスキャンし、チャンスのある銘柄を返す
   */
  async scan(symbols: string[]): Promise<ScanResult[]> {
    // 1. Input Validation
    if (!Array.isArray(symbols)) return [];
    
    // Limit total symbols to prevent resource exhaustion
    const sanitizedSymbols = symbols
      .slice(0, this.config.maxSymbols)
      .filter(s => typeof s === 'string' && s.length > 0 && s.length < 20);

    const results: ScanResult[] = [];

    // 2. Batch Processing (Concurrency Limiting)
    for (let i = 0; i < sanitizedSymbols.length; i += this.config.batchSize) {
      const batch = sanitizedSymbols.slice(i, i + this.config.batchSize);
      
      await Promise.all(batch.map(async (symbol) => {
        const market = symbol.match(/^[0-9]{4}$/) ? 'japan' : 'usa';
        
        try {
          const data = await this.dataHub.getData(symbol, market as 'japan' | 'usa');
          if (data.length < Math.max(this.config.rsiPeriod, this.config.smaPeriod)) return;

          const signals = this.analyze(data);
          if (signals.length > 0) {
            results.push({
              symbol,
              signals,
              score: signals.length * 10,
            });
          }
        } catch (error) {
          devError(`[AutoScreener] Failed to scan ${symbol}:`, error);
        }
      }));
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private analyze(data: OHLCV[]): string[] {
    const signals: string[] = [];
    const closes = data.map(d => d.close);

    // RSI check
    const rsi = technicalIndicatorService.calculateRSI(closes, this.config.rsiPeriod);
    if (rsi.length > 0) {
      const latestRsi = rsi[rsi.length - 1];
      if (latestRsi < this.config.rsiOversold) signals.push('OVERSOLD');
      if (latestRsi > this.config.rsiOverbought) signals.push('OVERBOUGHT');
    }

    // SMA Trend check
    const sma = technicalIndicatorService.calculateSMA(closes, this.config.smaPeriod);
    if (sma.length > 0) {
      const lastPrice = closes[closes.length - 1];
      if (lastPrice > sma[sma.length - 1]) {
        signals.push('BULLISH_TREND');
      }
    }

    return signals;
  }
}
