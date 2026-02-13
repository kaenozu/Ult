import { spawn } from 'child_process';
import path from 'path';

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

    // Run Python scraper
    return new Promise((resolve, reject) => {
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

      python.on('close', (code) => {
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
            reject(new Error(`Failed to parse scraper output: ${output}`));
          }
        } else {
          reject(new Error(`Scraper failed: ${error}`));
        }
      });
    });
  }
}

export const realTimeDataService = new RealTimeDataService();
