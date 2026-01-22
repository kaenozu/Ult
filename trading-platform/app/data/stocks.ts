import { Stock, OHLCV, Signal } from '../types';
import { marketClient } from '@/app/lib/api/data-aggregator';

export const JAPAN_STOCKS: Stock[] = [
  { symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6758', name: 'ソニーグループ', market: 'japan', sector: 'テクノロジー', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8035', name: '東京エレクトロン', market: 'japan', sector: '半導体', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9983', name: 'ファーストリテイリング', market: 'japan', sector: '小売', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6861', name: 'キーエンス', market: 'japan', sector: '電子部品', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8306', name: '三菱UFJ FG', market: 'japan', sector: '金融', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8316', name: '三井住友 FG', market: 'japan', sector: '金融', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7974', name: '任天堂', market: 'japan', sector: 'ゲーム', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6501', name: 'キヤノン', market: 'japan', sector: '電機', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4502', name: '武田薬品', market: 'japan', sector: '製薬', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7267', name: 'ホンダ', market: 'japan', sector: '自動車', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6301', name: 'コマツ', market: 'japan', sector: '建設機械', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6702', name: '信越化学', market: 'japan', sector: '化学', price: 0, change: 0, changePercent: 0, volume: 0 },
];

export const USA_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', sector: 'テクノロジー', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'usa', sector: 'テクノロジー', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'usa', sector: 'テクノロジー', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'usa', sector: '小売', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'META', name: 'Meta Platforms', market: 'usa', sector: 'SNS', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'usa', sector: '半導体', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'usa', sector: '自動車', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AMD', name: 'AMD Inc.', market: 'usa', sector: '半導体', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'usa', sector: '金融', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'V', name: 'Visa Inc.', market: 'usa', sector: '決済', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', market: 'usa', sector: 'ヘルスケア', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PFE', name: 'Pfizer Inc.', market: 'usa', sector: 'ヘルスケア', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'KO', name: 'Coca-Cola Co', market: 'usa', sector: '消費財', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PG', name: 'Procter & Gamble', market: 'usa', sector: '消費財', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'XOM', name: 'Exxon Mobil', market: 'usa', sector: 'エネルギー', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'UNH', name: 'UnitedHealth', market: 'usa', sector: 'ヘルスケア', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'BAC', name: 'Bank of America', market: 'usa', sector: '金融', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'INTC', name: 'Intel Corp.', market: 'usa', sector: '半導体', price: 0, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', market: 'usa', sector: '半導体', price: 0, change: 0, changePercent: 0, volume: 0 },
];

export const ALL_STOCKS = [...JAPAN_STOCKS, ...USA_STOCKS];

export const getStockBySymbol = (symbol: string): Stock | undefined => {
  return ALL_STOCKS.find(s => s.symbol === symbol);
};

export const getStocksByMarket = (market: 'japan' | 'usa'): Stock[] => {
  return ALL_STOCKS.filter(s => s.market === market);
};

export const getStocksBySector = (sector: string): Stock[] => {
  return ALL_STOCKS.filter(s => s.sector === sector);
};

// --- Real Data Access Methods ---

export async function fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan'): Promise<OHLCV[]> {
  const result = await marketClient.fetchOHLCV(symbol, market);
  return result.data || [];
}

export async function fetchSignal(stock: Stock): Promise<Signal | null> {
  const result = await marketClient.fetchSignal(stock);
  return result.data;
}
