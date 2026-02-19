/**
 * MultiSourceDataAggregator
 * 
 * Service for aggregating data from multiple sources with:
 * - Source prioritization and fallback
 * - Data fusion and reconciliation
 * - Cross-validation and consistency checks
 * - Automatic source health monitoring
 */

<<<<<<< HEAD
import { devLog, devWarn, devError } from '@/app/lib/utils/logger';
=======
>>>>>>> origin/main

import { DataQualityValidator, type CrossSourceValidation } from '@/app/lib/data/quality/DataQualityValidator';
import { devLog, devWarn } from '@/app/lib/utils/dev-logger';
import { DataLatencyMonitor } from '@/app/lib/data/latency/DataLatencyMonitor';
import type { MarketData } from '@/app/types/data-quality';
import type { OHLCV } from '@/app/types/shared';

export interface DataSource {
  id: string;
  name: string;
  priority: number; // Lower number = higher priority
  fetcher: (symbol: string) => Promise<MarketData>;
  enabled: boolean;
  healthScore: number; // 0-100
  lastError?: string;
  lastSuccessTime?: number;
}

export interface AggregationConfig {
  minSourceCount?: number; // Minimum sources to consider data valid
  maxSourceAge?: number; // Max age difference between sources (ms)
  consistencyThreshold?: number; // Max price discrepancy (%)
  enableHealthCheck?: boolean;
  healthCheckInterval?: number;
}

export interface AggregationResult {
  success: boolean;
  data: MarketData | null;
  sources: string[]; // Sources used
  primarySource: string;
  fallbackUsed: boolean;
  validation: CrossSourceValidation | null;
  warnings: string[];
  errors: string[];
}

/**
 * Multi-Source Data Aggregator
 * 
 * High-level orchestration service that manages multiple data sources.
 *
 * ARCHITECTURE NOTE:
 * This service is the intended future entry point for all market data access.
 * It coordinates:
 * - Source prioritization
 * - Data fusion and reconciliation
 * - Quality validation
 * - Health monitoring
 *
 * Legacy code using MarketDataClient directly should be migrated to use this aggregator.
 */
export class MultiSourceDataAggregator {
  private sources: Map<string, DataSource> = new Map();
  private qualityValidator: DataQualityValidator;
  private latencyMonitor: DataLatencyMonitor;
  private config: Required<AggregationConfig>;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor(config: AggregationConfig = {}) {
    this.config = {
      minSourceCount: config.minSourceCount || 1,
      maxSourceAge: config.maxSourceAge || 5000, // 5 seconds
      consistencyThreshold: config.consistencyThreshold || 5, // 5%
      enableHealthCheck: config.enableHealthCheck !== false,
      healthCheckInterval: config.healthCheckInterval || 60000, // 1 minute
    };
    
    this.qualityValidator = new DataQualityValidator();
    this.latencyMonitor = new DataLatencyMonitor();
    
    if (this.config.enableHealthCheck) {
      this.startHealthCheck();
    }
  }
  
  /**
   * Register a data source
   */
  registerSource(source: DataSource): void {
    this.sources.set(source.id, {
      ...source,
      enabled: source.enabled !== false,
      healthScore: source.healthScore || 100,
    });
    
    devLog(`[Aggregator] Registered source: ${source.name} (priority: ${source.priority})`);
  }
  
  /**
   * Unregister a data source
   */
  unregisterSource(sourceId: string): void {
    this.sources.delete(sourceId);
    devLog(`[Aggregator] Unregistered source: ${sourceId}`);
  }
  
  /**
   * Get all registered sources
   */
  getSources(): DataSource[] {
    return Array.from(this.sources.values()).sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Get enabled and healthy sources
   */
  getHealthySources(): DataSource[] {
    return this.getSources().filter(s => s.enabled && s.healthScore > 50);
  }
  
  /**
   * Aggregate data from multiple sources
   */
  async aggregate(symbol: string): Promise<AggregationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Get healthy sources sorted by priority
    const healthySources = this.getHealthySources();
    
    if (healthySources.length === 0) {
      return {
        success: false,
        data: null,
        sources: [],
        primarySource: '',
        fallbackUsed: false,
        validation: null,
        warnings,
        errors: ['No healthy sources available'],
      };
    }
    
    // Try to fetch from sources in priority order
    const fetchPromises = healthySources.map(async (source) => {
      try {
        const data = await this.fetchWithTimeout(source, symbol, 5000);
        this.updateSourceHealth(source.id, true);
        return { source, data, error: null };
      } catch (error) {
        this.updateSourceHealth(source.id, false, error);
        return { source, data: null, error: error instanceof Error ? error.message : String(error) };
      }
    });
    
    // Wait for all sources (or timeout)
    const results = await Promise.allSettled(fetchPromises);
    
    // Collect successful results
    const successfulResults: Array<{ source: DataSource; data: MarketData }> = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.data) {
        successfulResults.push({
          source: result.value.source,
          data: result.value.data,
        });
      } else if (result.status === 'fulfilled' && result.value.error) {
        errors.push(`${result.value.source.name}: ${result.value.error}`);
      }
    }
    
    // Check if we have enough sources
    if (successfulResults.length < this.config.minSourceCount) {
      return {
        success: false,
        data: null,
        sources: successfulResults.map(r => r.source.name),
        primarySource: '',
        fallbackUsed: false,
        validation: null,
        warnings,
        errors: [...errors, `Insufficient sources: ${successfulResults.length}/${this.config.minSourceCount}`],
      };
    }
    
    // Use primary source (highest priority)
    const primaryResult = successfulResults[0];
    const primaryData = primaryResult.data;
    
    // Record latency
    const latency = Date.now() - startTime;
    this.latencyMonitor.recordLatency(
      symbol,
      primaryData.timestamp,
      Date.now(),
      primaryResult.source.name
    );
    
    // Validate data quality
    const qualityReport = this.qualityValidator.validate(primaryData);
    if (!qualityReport.isValid) {
      errors.push(...qualityReport.errors);
    }
    if (qualityReport.warnings.length > 0) {
      warnings.push(...qualityReport.warnings);
    }
    
    // Cross-validate with other sources if available
    let validation: CrossSourceValidation | null = null;
    if (successfulResults.length > 1) {
      const sourceDataMap = new Map<string, MarketData>();
      successfulResults.forEach(result => {
        sourceDataMap.set(result.source.name, result.data);
      });
      
      validation = this.qualityValidator.validateCrossSources(sourceDataMap);
      
      if (validation && !validation.isConsistent) {
        warnings.push(
          `Data inconsistency detected: price discrepancy ${(validation.priceDiscrepancy * 100).toFixed(2)}%`
        );
        
        // If inconsistency is too high, try fallback
        if (validation.priceDiscrepancy > this.config.consistencyThreshold / 100) {
          if (successfulResults.length > 1) {
            // Use fallback (second priority source)
            const fallbackResult = successfulResults[1];
            warnings.push(`Using fallback source: ${fallbackResult.source.name}`);
            
            return {
              success: true,
              data: fallbackResult.data,
              sources: successfulResults.map(r => r.source.name),
              primarySource: fallbackResult.source.name,
              fallbackUsed: true,
              validation,
              warnings,
              errors,
            };
          }
        }
      }
    }
    
    return {
      success: true,
      data: primaryData,
      sources: successfulResults.map(r => r.source.name),
      primarySource: primaryResult.source.name,
      fallbackUsed: false,
      validation,
      warnings,
      errors,
    };
  }
  
  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    source: DataSource,
    symbol: string,
    timeout: number
  ): Promise<MarketData> {
    return Promise.race([
      source.fetcher(symbol),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), timeout)
      ),
    ]);
  }
  
  /**
   * Update source health score
   */
  private updateSourceHealth(sourceId: string, success: boolean, error?: unknown): void {
    const source = this.sources.get(sourceId);
    if (!source) return;
    
    if (success) {
      // Increase health score (up to 100)
      source.healthScore = Math.min(100, source.healthScore + 5);
      source.lastSuccessTime = Date.now();
      delete source.lastError;
    } else {
      // Decrease health score
      source.healthScore = Math.max(0, source.healthScore - 10);
      source.lastError = error instanceof Error ? error.message : String(error);
      
      // Disable source if health is too low
      if (source.healthScore < 20) {
        source.enabled = false;
        devWarn(`[Aggregator] Source ${source.name} disabled due to low health score`);
      }
    }
  }
  
  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkSourcesHealth();
    }, this.config.healthCheckInterval);
  }
  
  /**
   * Stop health check interval
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  /**
   * Check all sources health
   */
  private checkSourcesHealth(): void {
    const now = Date.now();
    
    for (const source of this.sources.values()) {
      // Re-enable sources that have recovered
      if (!source.enabled && source.healthScore > 50) {
        source.enabled = true;
        devLog(`[Aggregator] Re-enabled source: ${source.name}`);
      }
      
      // Decay health score for inactive sources
      if (source.lastSuccessTime && now - source.lastSuccessTime > 300000) { // 5 minutes
        source.healthScore = Math.max(0, source.healthScore - 1);
      }
    }
  }
  
  /**
   * Get aggregator statistics
   */
  getStats(): {
    totalSources: number;
    enabledSources: number;
    healthySources: number;
    avgHealthScore: number;
  } {
    const sources = this.getSources();
    const enabled = sources.filter(s => s.enabled);
    const healthy = sources.filter(s => s.enabled && s.healthScore > 50);
    const avgHealth = sources.length > 0
      ? sources.reduce((sum, s) => sum + s.healthScore, 0) / sources.length
      : 0;
    
    return {
      totalSources: sources.length,
      enabledSources: enabled.length,
      healthySources: healthy.length,
      avgHealthScore: avgHealth,
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthCheck();
    this.sources.clear();
  }
}

/**
 * Factory function to create MultiSourceDataAggregator
 */
export function createMultiSourceDataAggregator(config?: AggregationConfig): MultiSourceDataAggregator {
  return new MultiSourceDataAggregator(config);
}
