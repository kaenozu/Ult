import { OHLCV } from '../../types';

/**
 * IMarketDataHub インターフェース
 * データの重複取得を防止し、アプリケーション全体で一貫した市場データを提供します。
 */
export interface IMarketDataHub {
  /**
   * データを取得する。すでに最新データがあればそれを返し、なければ取得する。
   * 同時に複数のリクエストがあった場合、一つにまとめる（Deduplication）。
   */
  getData(symbol: string, market: 'japan' | 'usa'): Promise<OHLCV[]>;

  /**
   * データを最新の1件で更新する（リアルタイムデータ用）。
   */
  updateLatestPrice(symbol: string, price: number, timestamp: string): void;

  /**
   * キャッシュをクリアする。
   */
  clearCache(symbol?: string): void;
}
