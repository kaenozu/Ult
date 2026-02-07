import { OHLCV } from '@/app/types';

export interface DataProvider {
  name: string;
  fetch: (symbol: string) => Promise<OHLCV | null>;
}

/**
 * データ整合性・クォーラムエンジン
 * 複数のデータソースから値を照合し、真の価格を決定します。
 */
export class DataQuorumService {
  /**
   * 複数のソースからデータを取得し、異常値を排除して統合する
   */
  async getVerifiedPrice(symbol: string, providers: DataProvider[]): Promise<number | null> {
    const results = await Promise.all(providers.map(p => p.fetch(symbol)));
    const prices = results
      .filter((r): r is OHLCV => r !== null)
      .map(r => r.close);

    if (prices.length === 0) return null;
    if (prices.length === 1) return prices[0];

    // --- クォーラム（多数決/中央値）による異常値排除 ---
    prices.sort((a, b) => a - b);
    
    // 最大値と最小値の差が大きすぎる場合、中央値付近を採用する
    const median = prices[Math.floor(prices.length / 2)];
    
    // 中央値から5%以上離れているデータはノイズとして捨てる
    const validPrices = prices.filter(p => Math.abs(p - median) / median < 0.05);
    
    // 有効な価格の平均を返す
    return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  }
}

export const dataQuorumService = new DataQuorumService();
