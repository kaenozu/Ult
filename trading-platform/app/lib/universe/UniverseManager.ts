/**
 * Universe Manager for ULT Trading Platform
 * 
 * Manages a universe of up to 100 stock symbols with automatic maintenance,
 * on-demand expansion, and periodic updates.
 */

import { Stock } from '@/app/types';

/**
 * Universe stock with metadata
 */
export interface UniverseStock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market: 'japan' | 'usa';
  marketCap: number;
  addedAt: Date;
  lastUpdated: Date;
  active: boolean;
  performanceScore?: number;
  volatility?: number;
}

/**
 * Symbol validation result
 */
export interface SymbolValidationResult {
  valid: boolean;
  symbol: string;
  name?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  error?: string;
}

/**
 * Universe statistics
 */
export interface UniverseStats {
  totalStocks: number;
  activeStocks: number;
  usaStocks: number;
  japanStocks: number;
  sectors: Record<string, number>;
  avgMarketCap: number;
  lastUpdated: Date;
}

/**
 * Default US stocks for initial universe
 */
const DEFAULT_US_STOCKS: string[] = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT',
  'PG', 'JNJ', 'UNH', 'HD', 'MA', 'BAC', 'XOM', 'PFE', 'CSCO', 'ADBE',
  'CRM', 'NFLX', 'INTC', 'KO', 'PEP', 'TMO', 'ABT', 'COST', 'ABBV', 'MRK',
  'CVX', 'LLY', 'ACN', 'NKE', 'DHR', 'MCD', 'WFC', 'LIN', 'TXN', 'NEE',
  'AMD', 'ORCL', 'QCOM', 'DIS', 'VZ', 'IBM', 'GE', 'BA', 'CAT', 'GS'
];

/**
 * Default Japanese stocks for initial universe
 */
const DEFAULT_JP_STOCKS: string[] = [
  '7203', '6758', '9984', '8035', '4519', '6702', '8604', '6954', '6367', '6501',
  '8316', '6701', '6952', '6301', '4755', '6861', '7202', '6981', '4502', '4523',
  '4568', '4452', '4578', '6361', '6752', '6762', '6861', '6971', '7267', '7270',
  '7731', '7751', '7733', '8031', '8058', '8306', '8309', '8316', '8331', '8354',
  '8411', '8601', '8603', '8604', '8630', '8725', '8750', '8766', '8801', '8802'
];

/**
 * Universe manager class
 */
export class UniverseManager {
  private stocks: Map<string, UniverseStock> = new Map();
  private readonly MAX_STOCKS = 100;
  private lastUpdate: Date | null = null;
  private updateInterval: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Initialize universe manager
   */
  constructor() {
    // Initialize with empty state
  }

  /**
   * Initialize universe with default stocks
   */
  async initialize(): Promise<void> {
    const defaultStocks = [...DEFAULT_US_STOCKS, ...DEFAULT_JP_STOCKS];
    
    for (const symbol of defaultStocks) {
      if (this.stocks.size >= this.MAX_STOCKS) {
        break;
      }
      
      try {
        await this.addStock(symbol, false);
      } catch (error) {
        console.warn(`Failed to add default stock ${symbol}:`, error);
      }
    }
  }

  /**
   * Add a stock to the universe
   */
  async addStock(symbol: string, validate: boolean = true): Promise<UniverseStock> {
    const normalizedSymbol = symbol.toUpperCase().trim();

    // Check if already exists
    if (this.stocks.has(normalizedSymbol)) {
      return this.stocks.get(normalizedSymbol)!;
    }

    // Check maximum stock limit
    if (this.stocks.size >= this.MAX_STOCKS) {
      // Remove worst performing stock
      this.removeWorstPerformer();
    }

    // Validate symbol if requested
    if (validate) {
      const validation = await this.validateSymbol(normalizedSymbol);
      if (!validation.valid) {
        throw new Error(`Invalid symbol: ${normalizedSymbol} - ${validation.error}`);
      }
    }

    // Fetch stock info
    const stockInfo = await this.fetchStockInfo(normalizedSymbol);

    const stock: UniverseStock = {
      symbol: normalizedSymbol,
      name: stockInfo.name,
      sector: stockInfo.sector,
      industry: stockInfo.industry,
      market: this.determineMarket(normalizedSymbol),
      marketCap: stockInfo.marketCap,
      addedAt: new Date(),
      lastUpdated: new Date(),
      active: true,
      performanceScore: 0,
      volatility: 0,
    };

    this.stocks.set(normalizedSymbol, stock);
    return stock;
  }

  /**
   * Validate a symbol
   */
  async validateSymbol(symbol: string): Promise<SymbolValidationResult> {
    const normalizedSymbol = symbol.toUpperCase().trim();

    // Basic format validation
    if (!this.isValidSymbolFormat(normalizedSymbol)) {
      return {
        valid: false,
        symbol: normalizedSymbol,
        error: 'Invalid symbol format',
      };
    }

    // Check if already exists
    if (this.stocks.has(normalizedSymbol)) {
      return {
        valid: true,
        symbol: normalizedSymbol,
        name: this.stocks.get(normalizedSymbol)!.name,
      };
    }

    // Try to fetch stock data to validate
    try {
      const stockInfo = await this.fetchStockInfo(normalizedSymbol);
      return {
        valid: true,
        symbol: normalizedSymbol,
        name: stockInfo.name,
        sector: stockInfo.sector,
        industry: stockInfo.industry,
        marketCap: stockInfo.marketCap,
      };
    } catch (error) {
      return {
        valid: false,
        symbol: normalizedSymbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove a stock from the universe
   */
  removeStock(symbol: string): boolean {
    const normalizedSymbol = symbol.toUpperCase().trim();
    return this.stocks.delete(normalizedSymbol);
  }

  /**
   * Get a stock by symbol
   */
  getStock(symbol: string): UniverseStock | undefined {
    return this.stocks.get(symbol.toUpperCase().trim());
  }

  /**
   * Get all stocks
   */
  getAllStocks(): UniverseStock[] {
    return Array.from(this.stocks.values());
  }

  /**
   * Get active stocks
   */
  getActiveStocks(): UniverseStock[] {
    return Array.from(this.stocks.values()).filter(s => s.active);
  }

  /**
   * Get stocks by market
   */
  getStocksByMarket(market: 'japan' | 'usa'): UniverseStock[] {
    return Array.from(this.stocks.values()).filter(s => s.market === market);
  }

  /**
   * Get stocks by sector
   */
  getStocksBySector(sector: string): UniverseStock[] {
    return Array.from(this.stocks.values()).filter(s => 
      s.sector.toLowerCase() === sector.toLowerCase()
    );
  }

  /**
   * Update universe data
   */
  async updateUniverse(): Promise<void> {
    const now = new Date();
    
    // Check if update is needed
    if (this.lastUpdate && now.getTime() - this.lastUpdate.getTime() < this.updateInterval) {
      return; // Not time for update yet
    }

    for (const [symbol, stock] of this.stocks) {
      if (stock.active) {
        try {
          const updatedInfo = await this.fetchStockInfo(symbol);
          stock.lastUpdated = now;
          stock.marketCap = updatedInfo.marketCap;
          stock.volatility = updatedInfo.volatility || 0;
        } catch (error) {
          console.warn(`Failed to update stock ${symbol}:`, error);
          // Deactivate stocks that fail to update multiple times
          stock.active = false;
        }
      }
    }

    this.lastUpdate = now;
  }

  /**
   * Get universe statistics
   */
  getStats(): UniverseStats {
    const stocks = Array.from(this.stocks.values());
    const activeStocks = stocks.filter(s => s.active);
    const usaStocks = stocks.filter(s => s.market === 'usa');
    const japanStocks = stocks.filter(s => s.market === 'japan');
    
    // Calculate sector distribution
    const sectors: Record<string, number> = {};
    for (const stock of activeStocks) {
      sectors[stock.sector] = (sectors[stock.sector] || 0) + 1;
    }

    // Calculate average market cap
    const avgMarketCap = activeStocks.length > 0
      ? activeStocks.reduce((sum, s) => sum + s.marketCap, 0) / activeStocks.length
      : 0;

    return {
      totalStocks: stocks.length,
      activeStocks: activeStocks.length,
      usaStocks: usaStocks.length,
      japanStocks: japanStocks.length,
      sectors,
      avgMarketCap,
      lastUpdated: this.lastUpdate || new Date(),
    };
  }

  /**
   * Search stocks by name or symbol
   */
  searchStocks(query: string): UniverseStock[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    return Array.from(this.stocks.values()).filter(stock => 
      stock.symbol.toLowerCase().includes(normalizedQuery) ||
      stock.name.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Activate or deactivate a stock
   */
  setStockActive(symbol: string, active: boolean): boolean {
    const stock = this.stocks.get(symbol.toUpperCase().trim());
    if (stock) {
      stock.active = active;
      return true;
    }
    return false;
  }

  /**
   * Clear the universe
   */
  clear(): void {
    this.stocks.clear();
    this.lastUpdate = null;
  }

  /**
   * Remove worst performing stock
   */
  private removeWorstPerformer(): void {
    const activeStocks = this.getActiveStocks();
    
    if (activeStocks.length === 0) {
      return;
    }

    // Sort by performance score (ascending) and remove the worst
    const sortedStocks = activeStocks.sort((a, b) => 
      (a.performanceScore || 0) - (b.performanceScore || 0)
    );

    const worstStock = sortedStocks[0];
    this.stocks.delete(worstStock.symbol);
  }

  /**
   * Determine market from symbol
   */
  private determineMarket(symbol: string): 'japan' | 'usa' {
    // Japanese stocks are typically 4 digits
    return /^\d{4}$/.test(symbol) ? 'japan' : 'usa';
  }

  /**
   * Validate symbol format
   */
  private isValidSymbolFormat(symbol: string): boolean {
    // US stocks: 1-5 letters
    // Japanese stocks: 4 digits
    return /^[A-Z]{1,5}$/.test(symbol) || /^\d{4}$/.test(symbol);
  }

  /**
   * Fetch stock information
   */
  private async fetchStockInfo(symbol: string): Promise<{
    name: string;
    sector: string;
    industry: string;
    marketCap: number;
    volatility?: number;
  }> {
    // In a real implementation, this would call an API like AlphaVantage
    // For now, return mock data
    
    const mockData: Record<string, any> = {
      'AAPL': { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', marketCap: 2800000000000 },
      'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software', marketCap: 2500000000000 },
      'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services', marketCap: 1700000000000 },
      'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', industry: 'Internet Retail', marketCap: 1600000000000 },
      'TSLA': { name: 'Tesla Inc.', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', marketCap: 800000000000 },
      '7203': { name: 'Toyota Motor Corporation', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', marketCap: 30000000000000 },
      '6758': { name: 'Sony Group Corporation', sector: 'Technology', industry: 'Consumer Electronics', marketCap: 15000000000000 },
      '9984': { name: 'SoftBank Group Corp.', sector: 'Financial Services', industry: 'Asset Management', marketCap: 12000000000000 },
    };

    const data = mockData[symbol];
    
    if (data) {
      return {
        name: data.name,
        sector: data.sector,
        industry: data.industry,
        marketCap: data.marketCap,
        volatility: Math.random() * 0.5 + 0.1, // Mock volatility
      };
    }

    // Generate mock data for unknown symbols
    const isJapan = this.determineMarket(symbol) === 'japan';
    return {
      name: `${symbol} Corporation`,
      sector: isJapan ? 'Industrials' : 'Technology',
      industry: isJapan ? 'Manufacturing' : 'Software',
      marketCap: isJapan ? 1000000000000 : 50000000000,
      volatility: Math.random() * 0.5 + 0.1,
    };
  }

  /**
   * Set update interval
   */
  setUpdateInterval(milliseconds: number): void {
    this.updateInterval = milliseconds;
  }
}

// Singleton instance
let universeManagerInstance: UniverseManager | null = null;

/**
 * Get or create universe manager instance
 */
export function getUniverseManager(): UniverseManager {
  if (!universeManagerInstance) {
    universeManagerInstance = new UniverseManager();
  }
  return universeManagerInstance;
}
