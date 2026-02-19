import { spawn } from 'child_process';
import path from 'path';
import { devLog, devWarn, devError } from '@/app/lib/utils/logger';

export interface RealTimeQuote {
  symbol: string;
  price: number | null;
  bid: number | null;
  ask: number | null;
  timestamp: string;
}

export class RealTimeDataService {
  private cache = new Map<string, { data: RealTimeQuote; expiry: number }>();
  private cacheDuration = 15 * 1000; // 15 seconds
  private scraperPath = path.join(process.cwd(), '..', 'playwright_scraper', 'yahoo_japan_scraper.py');

  async fetchQuote(symbol: string): Promise<RealTimeQuote | null> {
    // Check cache
    const cached = this.cache.get(symbol);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // Force usage of Yahoo Finance library instead of unreliable local scraper
    // The local scraper (python) often returns 502s or incorrect data (e.g. Recruit 6098 at 1/5th price)
    return this.fetchFromYahooFinance(symbol);

    /* Scraper disabled
    // Run Python scraper
    return new Promise((resolve) => {
      // Use absolute path for robustness
      const python = spawn('python3', [this.scraperPath, symbol]);
      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', async (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            // Cache result
            this.cache.set(symbol, {
              data: result,
              expiry: Date.now() + this.cacheDuration
            });
            resolve(result);
          } catch (e) {
            // Fallback if parsing fails
            devWarn(`[RealTimeDataService] Scraper output parse error: ${e}. Falling back to Yahoo Finance.`);
            resolve(this.fetchFromYahooFinance(symbol));
          }
        } else {
          devWarn(`[RealTimeDataService] Scraper failed (code ${code}): ${error}. Falling back to Yahoo Finance.`);
          resolve(this.fetchFromYahooFinance(symbol));
        }
      });

      // Fallback on timeout
      setTimeout(() => {
        if (!python.killed) {
          python.kill();
          devWarn(`[RealTimeDataService] Scraper timed out. Falling back.`);
          resolve(this.fetchFromYahooFinance(symbol));
        }
      }, 5000);
    });
    */
  }

  private async fetchFromYahooFinance(symbol: string): Promise<RealTimeQuote | null> {
    try {
      // Dynamic import to avoid build issues if not available in edge
      // Dynamic import to avoid build issues if not available in edge
      const { default: YahooFinance } = await import('yahoo-finance2');
      const yf = new YahooFinance();

      // Yahoo Finance symbol format for Japan
      const yahooSymbol = symbol.endsWith('.T') ? symbol : `${symbol}.T`;
      const quote = (await yf.quote(yahooSymbol)) as any;

      devLog(`[RealTimeDataService] Raw Yahoo Finance Quote for ${yahooSymbol}:`, quote);

      if (!quote) return null;

      const result: RealTimeQuote = {
        symbol,
        price: quote.regularMarketPrice || null,
        bid: quote.bid || null,
        ask: quote.ask || null,
        timestamp: new Date().toISOString()
      };

      return result;
    } catch (err) {
      devError('[RealTimeDataService] Fallback failed:', err);
      return null;
    }
  }


}

export const realTimeDataService = new RealTimeDataService();
