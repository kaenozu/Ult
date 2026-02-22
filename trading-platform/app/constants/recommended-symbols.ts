export const RECOMMENDED_SYMBOLS = [
  { symbol: 'INTC', name: 'Intel', priority: 1, price: 44 },
  { symbol: 'TGT', name: 'Target', priority: 2, price: 117 },
  { symbol: 'WMT', name: 'Walmart', priority: 3, price: 123 },
  { symbol: 'AMZN', name: 'Amazon', priority: 4, price: 210 },
  { symbol: 'HON', name: 'Honeywell', priority: 5, price: 244 },
  { symbol: 'PNC', name: 'PNC Financial', priority: 6, price: 233 },
  { symbol: 'TMO', name: 'Thermo Fisher', priority: 7, price: 511 },
  { symbol: 'CAT', name: 'Caterpillar', priority: 8, price: 760 },
  { symbol: 'MCD', name: 'McDonalds', priority: 9, price: 329 },
  { symbol: 'COST', name: 'Costco', priority: 10, price: 985 },
  { symbol: 'BLK', name: 'BlackRock', priority: 11, price: 1094 },
  { symbol: 'SPY', name: 'S&P 500 ETF', priority: 12, price: 689, isETF: true },
  { symbol: 'IWM', name: 'Russell 2000 ETF', priority: 13, price: 265, isETF: true },
  { symbol: 'DIA', name: 'Dow Jones ETF', priority: 14, price: 496, isETF: true },
] as const;

export const BACKTEST_RESULTS = {
  strategy: 'EMA Cross (9/21) + ADX>25 + SMA50 Trend Filter',
  winRate: 60.9,
  expectancy: 2.99,
  stopLoss: 1.5,
  takeProfit: 6,
  verifiedAt: '2026-02-21',
  symbols: 14,
  trades: 64,
};

export const BEGINNER_SYMBOLS = [
  { symbol: 'INTC', name: 'Intel', minInvestment: 4400 },
  { symbol: 'TGT', name: 'Target', minInvestment: 11700 },
  { symbol: 'WMT', name: 'Walmart', minInvestment: 12300 },
];
