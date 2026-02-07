/**
 * Data Source Configuration Service
 * 
 * Manages multiple data source providers and selects the best one
 * based on market, interval, and availability
 */

import {
  DataSourceProvider,
  DataSourceConfig,
  DataSourceCapabilities,
  DATA_SOURCE_CAPABILITIES,
  MarketType,
  DataInterval,
  getBestDataSource,
  detectMarketType,
} from '../types/data-source';
import { logger } from '@/app/core/logger';

/**
 * Data source configuration manager
 */
export class DataSourceConfigService {
  private configs: Map<DataSourceProvider, DataSourceConfig> = new Map();
  
  constructor() {
    this.initializeDefaultConfig();
  }
  
  /**
   * Initialize default configuration with Yahoo Finance as the only enabled source
   */
  private initializeDefaultConfig(): void {
    // Yahoo Finance is the default (currently the only implemented source)
    this.configs.set(DataSourceProvider.YAHOO_FINANCE, {
      provider: DataSourceProvider.YAHOO_FINANCE,
      enabled: true,
      priority: 1,
      capabilities: DATA_SOURCE_CAPABILITIES[DataSourceProvider.YAHOO_FINANCE],
    });

    // Alternative sources (disabled by default, will be enabled when API keys are provided)
    this.configs.set(DataSourceProvider.IEX_CLOUD, {
      provider: DataSourceProvider.IEX_CLOUD,
      apiKey: process.env.IEX_CLOUD_API_KEY,
      enabled: !!process.env.IEX_CLOUD_API_KEY && this.validateApiKey(process.env.IEX_CLOUD_API_KEY),
      priority: 5,
      capabilities: DATA_SOURCE_CAPABILITIES[DataSourceProvider.IEX_CLOUD],
      baseUrl: 'https://cloud.iexapis.com/stable',
    });

    this.configs.set(DataSourceProvider.POLYGON, {
      provider: DataSourceProvider.POLYGON,
      apiKey: process.env.POLYGON_API_KEY,
      enabled: !!process.env.POLYGON_API_KEY && this.validateApiKey(process.env.POLYGON_API_KEY),
      priority: 4,
      capabilities: DATA_SOURCE_CAPABILITIES[DataSourceProvider.POLYGON],
      baseUrl: 'https://api.polygon.io',
    });

    this.configs.set(DataSourceProvider.ALPACA, {
      provider: DataSourceProvider.ALPACA,
      apiKey: process.env.ALPACA_API_KEY,
      enabled: !!process.env.ALPACA_API_KEY && !!process.env.ALPACA_SECRET_KEY &&
              this.validateApiKey(process.env.ALPACA_API_KEY) &&
              this.validateApiKey(process.env.ALPACA_SECRET_KEY),
      priority: 3,
      capabilities: DATA_SOURCE_CAPABILITIES[DataSourceProvider.ALPACA],
      baseUrl: 'https://data.alpaca.markets',
    });

    this.configs.set(DataSourceProvider.ALPHA_VANTAGE, {
      provider: DataSourceProvider.ALPHA_VANTAGE,
      apiKey: process.env.ALPHA_VANTAGE_API_KEY,
      enabled: !!process.env.ALPHA_VANTAGE_API_KEY && this.validateApiKey(process.env.ALPHA_VANTAGE_API_KEY),
      priority: 2,
      capabilities: DATA_SOURCE_CAPABILITIES[DataSourceProvider.ALPHA_VANTAGE],
      baseUrl: 'https://www.alphavantage.co/query',
    });
  }

  private validateApiKey(apiKey: string | undefined): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    if (apiKey.length < 10) {
      logger.warn('[DataSourceConfigService] API key appears invalid (too short)', undefined, 'DataSourceConfigService');
      return false;
    }
    if (['demo', 'test', 'your_api_key', 'your-key-here'].includes(apiKey.toLowerCase())) {
      logger.warn('[DataSourceConfigService] API key appears to be a placeholder', undefined, 'DataSourceConfigService');
      return false;
    }
    return true;
  }
  
  /**
   * Get configuration for a specific provider
   */
  getConfig(provider: DataSourceProvider): DataSourceConfig | undefined {
    return this.configs.get(provider);
  }
  
  /**
   * Get all configurations
   */
  getAllConfigs(): DataSourceConfig[] {
    return Array.from(this.configs.values());
  }
  
  /**
   * Get enabled configurations
   */
  getEnabledConfigs(): DataSourceConfig[] {
    return Array.from(this.configs.values()).filter(c => c.enabled);
  }
  
  /**
   * Select best data source for a symbol and interval
   */
  selectBestSource(symbol: string, interval: DataInterval): {
    config: DataSourceConfig | null;
    market: MarketType;
    warnings: string[];
  } {
    const market = detectMarketType(symbol);
    const availableSources = this.getEnabledConfigs();
    const config = getBestDataSource(market, interval, availableSources);
    
    const warnings: string[] = [];
    
    // Generate warnings based on selected source and requirements
    if (!config) {
      warnings.push('⚠️ 適切なデータソースが見つかりません');
      return { config: null, market, warnings };
    }
    
    const caps = config.capabilities;
    
    // Check if source has limitations
    if (!caps.realtime) {
      warnings.push(`⚠️ ${config.provider}: リアルタイムデータ非対応（${caps.delayMinutes}分遅延）`);
    }
    
    if (!caps.bidAsk) {
      warnings.push('⚠️ Bid/Askスプレッドデータなし - スリッページ計算不可');
    }
    
    if (!caps.tickData) {
      warnings.push('⚠️ ティックデータなし - 高頻度取引に不適切');
    }
    
    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    if (isIntraday && !caps.intraday) {
      warnings.push('⚠️ イントラデイデータ非対応 - 日次データにフォールバック');
    }
    
    if (market === 'japan' && !caps.japaneseStocks) {
      warnings.push('⚠️ 日本株非対応のデータソース');
    }
    
    // Add recommendations for better data sources
    if (config.provider === DataSourceProvider.YAHOO_FINANCE) {
      warnings.push('💡 推奨: リアルタイム取引には有料データソース（IEX Cloud、Polygon.io、Alpaca）の使用を検討してください');
    }
    
    return { config, market, warnings };
  }
  
  /**
   * Get data quality assessment for a configuration
   */
  assessDataQuality(config: DataSourceConfig, market: MarketType, interval: DataInterval): {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    reasons: string[];
  } {
    const caps = config.capabilities;
    const reasons: string[] = [];
    let score = 100;
    
    // Realtime check
    if (!caps.realtime) {
      score -= 30;
      reasons.push(`${caps.delayMinutes}分のデータ遅延`);
    }
    
    // Bid/Ask check
    if (!caps.bidAsk) {
      score -= 20;
      reasons.push('Bid/Askスプレッドなし');
    }
    
    // Tick data check
    if (!caps.tickData) {
      score -= 15;
      reasons.push('ティックデータなし');
    }
    
    // Intraday check
    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    if (isIntraday && !caps.intraday) {
      score -= 25;
      reasons.push('イントラデイデータ非対応');
    }
    
    // Market compatibility
    if (market === 'japan' && !caps.japaneseStocks) {
      score -= 50;
      reasons.push('日本株非対応');
    } else if (market === 'usa' && !caps.usStocks) {
      score -= 50;
      reasons.push('米国株非対応');
    }
    
    // Rate limit check
    if (caps.rateLimit.requestsPerMinute < 10) {
      score -= 10;
      reasons.push('厳しいレート制限');
    }
    
    // Determine quality level
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) {
      quality = 'excellent';
    } else if (score >= 70) {
      quality = 'good';
    } else if (score >= 50) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }
    
    return { quality, score, reasons };
  }
  
  /**
   * Get data source capabilities
   */
  getCapabilities(provider: DataSourceProvider): DataSourceCapabilities {
    return DATA_SOURCE_CAPABILITIES[provider];
  }
  
  /**
   * Check if any alternative data sources are configured
   */
  hasAlternativeSources(): boolean {
    return this.getEnabledConfigs().some(
      c => c.provider !== DataSourceProvider.YAHOO_FINANCE
    );
  }
  
  /**
   * Get configuration recommendations
   */
  getRecommendations(market: MarketType): string[] {
    const recommendations: string[] = [];
    
    if (!this.hasAlternativeSources()) {
      recommendations.push('⚠️ 現在Yahoo Financeのみ使用中 - リアルタイム取引には不十分');
      
      if (market === 'japan') {
        recommendations.push('💡 日本株のリアルタイムデータには専門の有料プロバイダーが必要です');
      } else {
        recommendations.push('💡 推奨データソース:');
        recommendations.push('  - IEX Cloud: $9/月〜、リアルタイム、米国株');
        recommendations.push('  - Polygon.io: $29/月〜、ティックデータ、高頻度取引対応');
        recommendations.push('  - Alpaca: 無料枠あり、リアルタイム、米国株');
      }
    }
    
    return recommendations;
  }
}

/**
 * Singleton instance
 */
export const dataSourceConfigService = new DataSourceConfigService();
