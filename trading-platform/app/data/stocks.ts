import { Stock, OHLCV, Signal } from '../types';

export const JAPAN_STOCKS: Stock[] = [
  { symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 3580, change: 85, changePercent: 2.43, volume: 15000000, high52w: 3800, low52w: 2800 },
  { symbol: '6758', name: 'ソニーグループ', market: 'japan', sector: 'テクノロジー', price: 14200, change: -250, changePercent: -1.73, volume: 8000000, high52w: 15500, low52w: 11000 },
  { symbol: '8035', name: '東京エレクトロン', market: 'japan', sector: '半導体', price: 28500, change: 1200, changePercent: 4.39, volume: 3500000, high52w: 32000, low52w: 18000 },
  { symbol: '9983', name: 'ファーストリテイリング', market: 'japan', sector: '小売', price: 38500, change: 450, changePercent: 1.18, volume: 2000000, high52w: 42000, low52w: 28000 },
  { symbol: '6861', name: 'キーエンス', market: 'japan', sector: '電子部品', price: 68000, change: 1500, changePercent: 2.25, volume: 500000, high52w: 75000, low52w: 50000 },
  { symbol: '8306', name: '三菱UFJ FG', market: 'japan', sector: '金融', price: 1150, change: 15, changePercent: 1.32, volume: 25000000, high52w: 1300, low52w: 800 },
  { symbol: '8316', name: '三井住友 FG', market: 'japan', sector: '金融', price: 6800, change: -80, changePercent: -1.16, volume: 12000000, high52w: 7500, low52w: 5000 },
  { symbol: '7974', name: '任天堂', market: 'japan', sector: 'ゲーム', price: 9200, change: 320, changePercent: 3.61, volume: 6000000, high52w: 10000, low52w: 6500 },
  { symbol: '6501', name: 'キヤノン', market: 'japan', sector: '電機', price: 4200, change: 65, changePercent: 1.57, volume: 4500000, high52w: 4800, low52w: 3200 },
  { symbol: '4502', name: '武田薬品', market: 'japan', sector: '製薬', price: 1780, change: -25, changePercent: -1.38, volume: 8000000, high52w: 2100, low52w: 1500 },
  { symbol: '7267', name: 'ホンダ', market: 'japan', sector: '自動車', price: 1580, change: -18, changePercent: -1.13, volume: 10000000, high52w: 1800, low52w: 1200 },
  { symbol: '6301', name: 'コマツ', market: 'japan', sector: '建設機械', price: 3800, change: 95, changePercent: 2.56, volume: 3500000, high52w: 4200, low52w: 2800 },
  { symbol: '6702', name: '信越化学', market: 'japan', sector: '化学', price: 5200, change: 80, changePercent: 1.56, volume: 4000000, high52w: 5800, low52w: 3800 },
];

export const USA_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', sector: 'テクノロジー', price: 185.50, change: 2.35, changePercent: 1.28, volume: 55000000, high52w: 199.62, low52w: 164.08 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'usa', sector: 'テクノロジー', price: 378.25, change: 4.85, changePercent: 1.30, volume: 22000000, high52w: 384.30, low52w: 309.45 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'usa', sector: 'テクノロジー', price: 141.80, change: -1.25, changePercent: -0.87, volume: 25000000, high52w: 153.78, low52w: 115.83 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'usa', sector: '小売', price: 178.35, change: 3.20, changePercent: 1.83, volume: 45000000, high52w: 189.77, low52w: 118.35 },
  { symbol: 'META', name: 'Meta Platforms', market: 'usa', sector: 'SNS', price: 485.60, change: 8.45, changePercent: 1.77, volume: 18000000, high52w: 542.81, low52w: 274.38 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'usa', sector: '半導体', price: 875.40, change: 25.80, changePercent: 3.04, volume: 42000000, high52w: 974.00, low52w: 222.97 },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'usa', sector: '自動車', price: 248.50, change: -5.20, changePercent: -2.05, volume: 98000000, high52w: 299.29, low52w: 152.37 },
  { symbol: 'AMD', name: 'AMD Inc.', market: 'usa', sector: '半導体', price: 178.25, change: 4.15, changePercent: 2.38, volume: 55000000, high52w: 227.48, low52w: 102.71 },
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'usa', sector: '金融', price: 185.40, change: 1.85, changePercent: 1.01, volume: 12000000, high52w: 200.94, low52w: 135.19 },
  { symbol: 'V', name: 'Visa Inc.', market: 'usa', sector: '決済', price: 275.80, change: 2.45, changePercent: 0.90, volume: 8000000, high52w: 290.96, low52w: 227.73 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', market: 'usa', sector: 'ヘルスケア', price: 158.20, change: -0.85, changePercent: -0.53, volume: 7000000, high52w: 175.97, low52w: 143.13 },
  { symbol: 'PFE', name: 'Pfizer Inc.', market: 'usa', sector: 'ヘルスケア', price: 28.45, change: 0.35, changePercent: 1.24, volume: 35000000, high52w: 31.17, low52w: 24.83 },
  { symbol: 'KO', name: 'Coca-Cola Co', market: 'usa', sector: '消費財', price: 62.80, change: 0.25, changePercent: 0.40, volume: 15000000, high52w: 64.99, low52w: 51.55 },
  { symbol: 'PG', name: 'Procter & Gamble', market: 'usa', sector: '消費財', price: 158.90, change: 1.15, changePercent: 0.73, volume: 6000000, high52w: 165.35, low52w: 141.45 },
  { symbol: 'XOM', name: 'Exxon Mobil', market: 'usa', sector: 'エネルギー', price: 105.60, change: -1.20, changePercent: -1.12, volume: 18000000, high52w: 112.50, low52w: 81.56 },
  { symbol: 'UNH', name: 'UnitedHealth', market: 'usa', sector: 'ヘルスケア', price: 528.40, change: 5.80, changePercent: 1.11, volume: 4000000, high52w: 558.10, low52w: 428.85 },
  { symbol: 'BAC', name: 'Bank of America', market: 'usa', sector: '金融', price: 34.25, change: 0.45, changePercent: 1.33, volume: 45000000, high52w: 38.60, low52w: 24.96 },
  { symbol: 'INTC', name: 'Intel Corp.', market: 'usa', sector: '半導体', price: 43.85, change: -0.95, changePercent: -2.12, volume: 35000000, high52w: 52.37, low52w: 29.65 },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', market: 'usa', sector: '半導体', price: 178.50, change: 3.25, changePercent: 1.85, volume: 8000000, high52w: 186.80, low52w: 121.46 },
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

export const generateMockOHLCV = (basePrice: number, days: number = 100): OHLCV[] => {
  const data: OHLCV[] = [];
  let currentPrice = basePrice;
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const volatility = 0.02;
    const change = (Math.random() - 0.48) * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;

    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  return data;
};

export const generateMockSignal = (stock: Stock): Signal => {
  const random = Math.random();

  let type: 'BUY' | 'SELL' | 'HOLD';
  let confidence: number;
  let predictedChange: number;
  let reason: string;

  if (random > 0.6) {
    type = 'BUY';
    confidence = 65 + Math.random() * 25;
    predictedChange = Math.random() * 10 + 2;
    reason = 'RSIが売られ過ぎ領域、移動平均線とのゴールデンクロス発生';
  } else if (random > 0.3) {
    type = 'HOLD';
    confidence = 50 + Math.random() * 20;
    predictedChange = (Math.random() - 0.5) * 4;
    reason = '中立、市場のトレンドを様子見推奨';
  } else {
    type = 'SELL';
    confidence = 65 + Math.random() * 25;
    predictedChange = -(Math.random() * 10 + 2);
    reason = '高値圏、RSIが買われ過ぎ領域';
  }

  const targetPrice = stock.price * (1 + predictedChange / 100);
  const stopLoss = stock.price * (type === 'BUY' ? 0.95 : 1.05);

  return {
    symbol: stock.symbol,
    type,
    confidence: parseFloat(confidence.toFixed(1)),
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    reason,
    predictedChange: parseFloat(predictedChange.toFixed(2)),
    predictionDate: new Date().toISOString().split('T')[0],
  };
};

export async function fetchOHLCVFromAPI(symbol: string, days: number = 100): Promise<OHLCV[]> {
  const { getDataAggregator } = await import('@/app/lib/api/data-aggregator');
  const aggregator = getDataAggregator();
  const result = await aggregator.fetchOHLCV(symbol, days);
  return result.data || [];
}

export async function fetchSignalFromAPI(stock: Stock): Promise<Signal> {
  const { getDataAggregator } = await import('@/app/lib/api/data-aggregator');
  const aggregator = getDataAggregator();
  const result = await aggregator.fetchSignal(stock);
  return result.data || generateMockSignal(stock);
}
