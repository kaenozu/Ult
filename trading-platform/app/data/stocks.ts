import { Stock, OHLCV, Signal } from '../types';
import { marketClient } from '@/app/lib/api/data-aggregator';

export const JAPAN_STOCKS: Stock[] = [
  // テクノロジー・半導体
  { symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 3580, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6758', name: 'ソニーグループ', market: 'japan', sector: 'テクノロジー', price: 13200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8035', name: '東京エレクトロン', market: 'japan', sector: '半導体', price: 38500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9983', name: 'ファーストリテイリング', market: 'japan', sector: '小売', price: 42000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6702', name: '信越化学工業', market: 'japan', sector: '化学', price: 6200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6501', name: '日立製作所', market: 'japan', sector: '電機', price: 15000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6861', name: 'キーエンス', market: 'japan', sector: '電子部品', price: 65000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7974', name: '任天堂', market: 'japan', sector: 'ゲーム', price: 8500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6723', name: 'ルネサスエレクトロニクス', market: 'japan', sector: '半導体', price: 2500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6146', name: 'ディスコ', market: 'japan', sector: '半導体装置', price: 45000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6920', name: 'レーザーテック', market: 'japan', sector: '半導体装置', price: 35000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6752', name: 'パナソニック', market: 'japan', sector: '電機', price: 1400, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6981', name: '村田製作所', market: 'japan', sector: '電子部品', price: 3000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6954', name: 'ファナック', market: 'japan', sector: '機械', price: 4200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6503', name: '三菱電機', market: 'japan', sector: '電機', price: 2500, change: 0, changePercent: 0, volume: 0 },
  
  // 金融
  { symbol: '8306', name: '三菱UFJ FG', market: 'japan', sector: '金融', price: 1500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8316', name: '三井住友 FG', market: 'japan', sector: '金融', price: 9000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8411', name: 'みずほ FG', market: 'japan', sector: '金融', price: 3000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8604', name: '野村ホールディングス', market: 'japan', sector: '証券', price: 900, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8766', name: '東京海上 HD', market: 'japan', sector: '保険', price: 5000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8591', name: 'オリックス', market: 'japan', sector: '金融', price: 3200, change: 0, changePercent: 0, volume: 0 },
  
  // エネルギー・商社
  { symbol: '1605', name: 'INPEX', market: 'japan', sector: 'エネルギー', price: 2300, change: 0, changePercent: 0, volume: 0 },
  { symbol: '5020', name: 'ENEOS HD', market: 'japan', sector: 'エネルギー', price: 700, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8058', name: '三菱商事', market: 'japan', sector: '卸売', price: 3200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8001', name: '伊藤忠商事', market: 'japan', sector: '卸売', price: 6500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8031', name: '三井物産', market: 'japan', sector: '卸売', price: 6000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '8053', name: '住友商事', market: 'japan', sector: '卸売', price: 3500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '2768', name: '双日', market: 'japan', sector: '卸売', price: 3800, change: 0, changePercent: 0, volume: 0 },
  
  // 輸送・機械
  { symbol: '7201', name: '日産自動車', market: 'japan', sector: '自動車', price: 550, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7267', name: 'ホンダ', market: 'japan', sector: '自動車', price: 1800, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7261', name: 'マツダ', market: 'japan', sector: '自動車', price: 1500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7205', name: '日野自動車', market: 'japan', sector: '自動車', price: 500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6301', name: 'コマツ', market: 'japan', sector: '建設機械', price: 4300, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7011', name: '三菱重工業', market: 'japan', sector: '産業機械', price: 12000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7012', name: '川崎重工業', market: 'japan', sector: '産業機械', price: 5000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '7013', name: 'IHI', market: 'japan', sector: '産業機械', price: 4500, change: 0, changePercent: 0, volume: 0 },
  
  // 通信・サービス
  { symbol: '9984', name: 'ソフトバンクグループ', market: 'japan', sector: 'テクノロジー', price: 8500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9432', name: 'NTT', market: 'japan', sector: '通信', price: 180, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9433', name: 'KDDI', market: 'japan', sector: '通信', price: 4500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9434', name: 'ソフトバンク', market: 'japan', sector: '通信', price: 1900, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4689', name: 'LINEヤフー', market: 'japan', sector: 'テクノロジー', price: 450, change: 0, changePercent: 0, volume: 0 },
  { symbol: '6098', name: 'リクルート HD', market: 'japan', sector: 'サービス', price: 7500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4385', name: 'メルカリ', market: 'japan', sector: 'テクノロジー', price: 2200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '2413', name: 'エムスリー', market: 'japan', sector: 'サービス', price: 2000, change: 0, changePercent: 0, volume: 0 },
  
  // 消費財・小売・製薬
  { symbol: '3382', name: 'セブン&アイ', market: 'japan', sector: '小売', price: 2100, change: 0, changePercent: 0, volume: 0 },
  { symbol: '9843', name: 'ニトリ HD', market: 'japan', sector: '小売', price: 22000, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4502', name: '武田薬品工業', market: 'japan', sector: '製薬', price: 4200, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4519', name: '中外製薬', market: 'japan', sector: '製薬', price: 5500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4523', name: 'エーザイ', market: 'japan', sector: '製薬', price: 6500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4503', name: 'アステラス製薬', market: 'japan', sector: '製薬', price: 1600, change: 0, changePercent: 0, volume: 0 },
  { symbol: '4568', name: '第一三共', market: 'japan', sector: '製薬', price: 5500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '2802', name: '味の素', market: 'japan', sector: '食品', price: 5800, change: 0, changePercent: 0, volume: 0 },
  { symbol: '2502', name: 'アサヒグループ HD', market: 'japan', sector: '飲料', price: 5500, change: 0, changePercent: 0, volume: 0 },
  { symbol: '2503', name: 'キリン HD', market: 'japan', sector: '飲料', price: 2100, change: 0, changePercent: 0, volume: 0 },
  { symbol: '2914', name: 'JT', market: 'japan', sector: '食品', price: 4000, change: 0, changePercent: 0, volume: 0 },
];

export const USA_STOCKS: Stock[] = [
  // テクノロジー (Mag 7 + Major)
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', sector: 'テクノロジー', price: 185, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'usa', sector: 'テクノロジー', price: 420, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'usa', sector: 'テクノロジー', price: 175, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'usa', sector: '小売', price: 180, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'META', name: 'Meta Platforms', market: 'usa', sector: 'SNS', price: 480, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'usa', sector: '半導体', price: 900, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'usa', sector: '自動車', price: 170, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', market: 'usa', sector: '半導体', price: 1300, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'ASML', name: 'ASML Holding', market: 'usa', sector: '半導体', price: 950, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AMD', name: 'AMD Inc.', market: 'usa', sector: '半導体', price: 160, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'INTC', name: 'Intel Corp.', market: 'usa', sector: '半導体', price: 30, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', market: 'usa', sector: '半導体', price: 170, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'CRM', name: 'Salesforce Inc.', market: 'usa', sector: 'ソフトウェア', price: 300, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'ADBE', name: 'Adobe Inc.', market: 'usa', sector: 'ソフトウェア', price: 500, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'NFLX', name: 'Netflix Inc.', market: 'usa', sector: 'エンターテイメント', price: 600, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'CSCO', name: 'Cisco Systems', market: 'usa', sector: 'ネットワーク', price: 50, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'ORCL', name: 'Oracle Corp.', market: 'usa', sector: 'ソフトウェア', price: 125, change: 0, changePercent: 0, volume: 0 },
  
  // 金融
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'usa', sector: '金融', price: 195, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'BAC', name: 'Bank of America', market: 'usa', sector: '金融', price: 38, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'V', name: 'Visa Inc.', market: 'usa', sector: '決済', price: 275, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'MA', name: 'Mastercard Inc.', market: 'usa', sector: '決済', price: 450, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'GS', name: 'Goldman Sachs', market: 'usa', sector: '金融', price: 400, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'MS', name: 'Morgan Stanley', market: 'usa', sector: '金融', price: 90, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AXP', name: 'American Express', market: 'usa', sector: '決済', price: 220, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PYPL', name: 'PayPal Holdings', market: 'usa', sector: '決済', price: 65, change: 0, changePercent: 0, volume: 0 },
  
  // 消費財・小売・ヘルスケア
  { symbol: 'KO', name: 'Coca-Cola Co', market: 'usa', sector: '消費財', price: 60, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PG', name: 'Procter & Gamble', market: 'usa', sector: '消費財', price: 160, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', market: 'usa', sector: '消費財', price: 170, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'WMT', name: 'Walmart Inc.', market: 'usa', sector: '小売', price: 60, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'COST', name: 'Costco Wholesale', market: 'usa', sector: '小売', price: 750, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'HD', name: 'Home Depot', market: 'usa', sector: '小売', price: 350, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'MCD', name: 'McDonald\'s Corp.', market: 'usa', sector: '飲食', price: 280, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'NKE', name: 'Nike Inc.', market: 'usa', sector: '消費財', price: 95, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', market: 'usa', sector: 'ヘルスケア', price: 150, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'PFE', name: 'Pfizer Inc.', market: 'usa', sector: 'ヘルスケア', price: 28, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'UNH', name: 'UnitedHealth', market: 'usa', sector: 'ヘルスケア', price: 480, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', market: 'usa', sector: 'ヘルスケア', price: 175, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'MRK', name: 'Merck & Co.', market: 'usa', sector: 'ヘルスケア', price: 130, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', market: 'usa', sector: 'ヘルスケア', price: 750, change: 0, changePercent: 0, volume: 0 },
  
  // エネルギー・インフラ・他
  { symbol: 'XOM', name: 'Exxon Mobil', market: 'usa', sector: 'エネルギー', price: 115, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'CVX', name: 'Chevron Corp.', market: 'usa', sector: 'エネルギー', price: 150, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'DIS', name: 'Walt Disney', market: 'usa', sector: 'エンターテイメント', price: 110, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'BA', name: 'Boeing Co.', market: 'usa', sector: '航空宇宙', price: 180, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'CAT', name: 'Caterpillar Inc.', market: 'usa', sector: '機械', price: 350, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'GE', name: 'General Electric', market: 'usa', sector: 'インフラ', price: 160, change: 0, changePercent: 0, volume: 0 },
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

export async function fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', currentPrice?: number, signal?: AbortSignal): Promise<OHLCV[]> {
  const result = await marketClient.fetchOHLCV(symbol, market, currentPrice, signal);
  return result.data || [];
}

export async function fetchSignal(stock: Stock, signal?: AbortSignal): Promise<Signal | null> {
  const result = await marketClient.fetchSignal(stock, signal);
  return result.data;
}

/**
 * リストにない銘柄のメタデータを取得してStockオブジェクトを生成する（オンデマンド拡張）
 */
export async function fetchStockMetadata(symbol: string): Promise<Stock | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  // 4桁の数字または.Tで終わる場合は日本市場と判定
  const isJapan = /^\d{4}$/.test(cleanSymbol) || cleanSymbol.endsWith('.T');
  const market = isJapan ? 'japan' : 'usa';
  
  try {
    const quote = await marketClient.fetchQuote(cleanSymbol, market);
    if (!quote) return null;

    return {
      symbol: quote.symbol.replace('.T', ''), // 表示はサフィックスなし
      name: quote.symbol.replace('.T', '') + (market === 'japan' ? ' (JP)' : ' (US)'),
      market,
      sector: market === 'japan' ? '日本市場' : '米国市場', // 詳細セクターは分析時に補完
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume
    };
  } catch (error) {
    console.error('Metadata fetch failed for:', cleanSymbol, error);
    return null;
  }
}
