/**
 * MLIntegrationService.ts
 * 
 * Central service for ML model integration with graceful fallback.
 * Handles model loading, availability checks, and fallback to rule-based predictions.
 */

import { Signal, OHLCV, Stock } from '@/app/types';
import { ML_MODEL_CONFIG } from '@/app/constants/prediction';
import { predictionWorkerClient } from '@/app/domains/prediction/services/worker-client';

/**
 * ML Model Status
 */
import { logger } from '@/app/core/logger';
export interface MLModelStatus {
  available: boolean;
  initialized: boolean;
  modelsLoaded: string[];
  lastError?: string;
  lastCheck: string;
}

/**
 * ML Integration Service
 * Provides centralized ML model management with graceful degradation
 */
export class MLIntegrationService {
  private static instance: MLIntegrationService;
  private modelStatus: MLModelStatus = {
    available: false, // Default to false until initialized
    initialized: false,
    modelsLoaded: [],
    lastCheck: new Date().toISOString(),
  };

  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): MLIntegrationService {
    if (!MLIntegrationService.instance) {
      MLIntegrationService.instance = new MLIntegrationService();
    }
    return MLIntegrationService.instance;
  }

  /**
   * Initialize ML models (called once on app startup)
   */
  public async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.modelStatus.initialized) {
      return;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Initialize Worker infrastructure
      logger.info('[ML Integration] Initializing Prediction Worker...');
      
      // In test environment, default to unavailable unless explicitly enabled
      const nodeEnv = process.env.NODE_ENV;
      const isTest = nodeEnv === 'test';
      const forceEnable = process.env.ENABLE_AI_PREDICTION === 'true';
      const available = !isTest || forceEnable;
      
      this.modelStatus = {
        available,
        initialized: true,
        modelsLoaded: available ? ['ENSEMBLE_WORKER', 'RF', 'XGB', 'LSTM'] : [],
        lastCheck: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('[ML Integration] Worker initialization failed:', error instanceof Error ? error : new Error(String(error)));
      this.modelStatus = {
        available: false,
        initialized: true,
        modelsLoaded: [],
        lastCheck: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Check if ML models are available
   */
  public isAvailable(): boolean {
    return this.modelStatus.available;
  }

  /**
   * Get current model status
   */
  public getStatus(): MLModelStatus {
    return { ...this.modelStatus };
  }

  /**
   * Get ML-enhanced prediction via Web Worker (Off-main-thread)
   * With integrated timeout and error recovery
   */
  public async predictWithML(
    stock: Stock,
    ohlcvData: OHLCV[],
    indexData?: OHLCV[]
  ): Promise<Signal | null> {
    // Ensure initialization
    if (!this.modelStatus.initialized) {
      await this.initialize();
    }

    if (!this.modelStatus.available) {
      return null;
    }

    // Set a timeout for the worker to prevent UI from waiting indefinitely
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        logger.warn(`[ML Integration] Prediction timeout for ${stock.symbol}`);
        resolve(null);
      }, 5000); // 5 second timeout
    });

    try {
      const predictionPromise = predictionWorkerClient.predictOffMainThread(
        stock,
        ohlcvData,
        indexData
      );

      const result = await Promise.race([predictionPromise, timeoutPromise]);
      
      if (!result) return null;
      
      return (result as any).signal;
    } catch (error) {
      logger.error(`[ML Integration] Worker prediction failed for ${stock.symbol}:`, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Record prediction outcome for model performance tracking
   */
  public recordPredictionOutcome(
    predictionId: string,
    actualValue: number,
    predictedValue: number
  ): void {
    // TODO: Implement prediction tracking for model performance monitoring
    if (this.modelStatus.available) {
      logger.debug('[ML Integration] Recording prediction outcome:', {
        predictionId,
        actualValue,
        predictedValue,
        error: Math.abs(actualValue - predictedValue),
      });
    }
  }

  /**
   * Get model performance report
   */
  public getPerformanceReport(): {
    available: boolean;
    accuracy?: number;
    directionalAccuracy?: number;
    profitFactor?: number;
    maxDrawdown?: number;
  } {
    if (!this.modelStatus.available) {
      return {
        available: false,
      };
    }

    // TODO: Return actual performance metrics when models are active
    return {
      available: true,
      accuracy: 0,
      directionalAccuracy: 0,
      profitFactor: 0,
      maxDrawdown: 0,
    };
  }

  /**
   * Force re-initialization (useful for testing or after model updates)
   */
  public async reinitialize(): Promise<void> {
    this.modelStatus.initialized = false;
    this.initializationPromise = null;
    return this.initialize();
  }
}

// Export singleton instance
export const mlIntegrationService = MLIntegrationService.getInstance();
