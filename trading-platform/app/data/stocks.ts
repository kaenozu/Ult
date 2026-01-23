import { Stock, OHLCV, Signal } from '../types';
import { marketClient } from '@/app/lib/api/data-aggregator';

export const JAPAN_STOCKS: Stock[] = [
  { symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 3580, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6758', name: 'ソニーグループ', market: 'japan', sector: 'テクノロジー', price: 13200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8035', name: '東京エレクトロン', market: 'japan', sector: '半導体', price: 38500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9983', name: 'ファーストリテイリング', market: 'japan', sector: '小売', price: 42000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6861', name: 'キーエンス', market: 'japan', sector: '電子部品', price: 65000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8306', name: '三菱UFJ FG', market: 'japan', sector: '銀行', price: 1500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8316', name: '三井住友 FG', market: 'japan', sector: '銀行', price: 9000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7974', name: '任天堂', market: 'japan', sector: 'ゲーム', price: 8500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6501', name: '日立製作所', market: 'japan', sector: '電機', price: 12000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4502', name: '武田薬品', market: 'japan', sector: '製薬', price: 4200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7267', name: 'ホンダ', market: 'japan', sector: '自動車', price: 1800, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6301', name: 'コマツ', market: 'japan', sector: '建設機械', price: 4300, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6702', name: '富士通', market: 'japan', sector: 'テクノロジー', price: 2400, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4063', name: '信越化学', market: 'japan', sector: '化学', price: 6200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8001', name: '伊藤忠商事', market: 'japan', sector: '商社', price: 6500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8058', name: '三菱商事', market: 'japan', sector: '商社', price: 3200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9432', name: '日本電信電話(NTT)', market: 'japan', sector: '通信', price: 180, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9433', name: 'KDDI', market: 'japan', sector: '通信', price: 4500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9984', name: 'ソフトバンクグループ', market: 'japan', sector: '投資', price: 8500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6098', name: 'リクルートHD', market: 'japan', sector: 'サービス', price: 6200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6902', name: 'デンソー', market: 'japan', sector: '自動車部品', price: 2800, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7011', name: '三菱重工業', market: 'japan', sector: '重工業', price: 1300, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8411', name: 'みずほFG', market: 'japan', sector: '銀行', price: 3000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8766', name: '東京海上HD', market: 'japan', sector: '保険', price: 4500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9101', name: '日本郵船', market: 'japan', sector: '海運', price: 4800, change: 0, changePercent: 0, volume: 0 },
];

export const USA_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', sector: 'テクノロジー', price: 185, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'usa', sector: 'テクノロジー', price: 420, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'usa', sector: 'テクノロジー', price: 175, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'usa', sector: '小売', price: 180, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'META', name: 'Meta Platforms', market: 'usa', sector: 'SNS', price: 480, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'usa', sector: '半導体', price: 900, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'usa', sector: '自動車', price: 170, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AMD', name: 'AMD Inc.', market: 'usa', sector: '半導体', price: 160, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'usa', sector: '金融', price: 195, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'V', name: 'Visa Inc.', market: 'usa', sector: '決済', price: 275, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', market: 'usa', sector: 'ヘルスケア', price: 150, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PFE', name: 'Pfizer Inc.', market: 'usa', sector: 'ヘルスケア', price: 28, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'KO', name: 'Coca-Cola Co', market: 'usa', sector: '消費財', price: 60, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PG', name: 'Procter & Gamble', market: 'usa', sector: '消費財', price: 160, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'XOM', name: 'Exxon Mobil', market: 'usa', sector: 'エネルギー', price: 115, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'UNH', name: 'UnitedHealth', market: 'usa', sector: 'ヘルスケア', price: 480, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'BAC', name: 'Bank of America', market: 'usa', sector: '金融', price: 38, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'INTC', name: 'Intel Corp.', market: 'usa', sector: '半導体', price: 30, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'NFLX', name: 'Netflix Inc.', market: 'usa', sector: 'エンタメ', price: 600, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'DIS', name: 'Walt Disney Co', market: 'usa', sector: 'エンタメ', price: 110, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'CRM', name: 'Salesforce Inc', market: 'usa', sector: 'クラウド', price: 300, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AVGO', name: 'Broadcom Inc', market: 'usa', sector: '半導体', price: 1300, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'COST', name: 'Costco Wholesale', market: 'usa', sector: '小売', price: 730, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'WMT', name: 'Walmart Inc', market: 'usa', sector: '小売', price: 60, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'GS', name: 'Goldman Sachs', market: 'usa', sector: '金融', price: 400, change: 0, changePercent: 0, volume: 0 },
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

export async function fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', currentPrice?: number): Promise<OHLCV[]> {
  const result = await marketClient.fetchOHLCV(symbol, market, currentPrice);
  return result.data || [];
}

export async function fetchSignal(stock: Stock): Promise<Signal | null> {
  const result = await marketClient.fetchSignal(stock);
  return result.data;
}

// --- Mock Data Generators ---

export function generateMockOHLCV(startPrice: number, count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let currentPrice = startPrice;
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - i));
    
    const change = currentPrice * (Math.random() * 0.04 - 0.02);
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + (Math.random() * 0.01 * currentPrice);
    const low = Math.min(open, close) - (Math.random() * 0.01 * currentPrice);
    const volume = Math.floor(Math.random() * 1000000) + 500000;

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });
    currentPrice = close;
  }
  return data;
}

export function generateMockSignal(stock: Stock): Signal {
  const types: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
  const type = types[Math.floor(Math.random() * types.length)];
  const confidence = Math.floor(Math.random() * 40) + 55; // 55-95
  const predictedChange = (Math.random() * 10 - 5); // -5% to +5%
  
  const targetPrice = type === 'BUY' 
    ? stock.price * (1 + (Math.abs(predictedChange) / 100))
    : stock.price * (1 - (Math.abs(predictedChange) / 100));
    
  const stopLoss = type === 'BUY'
    ? stock.price * (1 - (Math.abs(predictedChange) / 200))
    : stock.price * (1 + (Math.abs(predictedChange) / 200));

  return {
    symbol: stock.symbol,
    type,
    confidence,
    targetPrice,
    stopLoss,
    reason: `テクニカル指標とAIモデルの統合分析により、短期的な${type === 'BUY' ? '上昇' : type === 'SELL' ? '下落' : '横ばい'}トレンドが予想されます。`,
    predictedChange,
    predictionDate: new Date().toISOString().split('T')[0],
  };
}
