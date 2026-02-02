/**
 * Anomaly Detection Integration Example
 * TRADING-010: 異常検知と市場予測システムの実装
 * 
 * This example shows how to integrate the anomaly detection system
 * with existing market data services.
 */

import { AnomalyDetector, EventPredictor, AlertManager } from '@/app/lib/aiAnalytics/AnomalyDetection';
import { MarketData } from '@/app/lib/aiAnalytics/AnomalyDetection/types';
import { OHLCV } from '@/app/types/shared';

/**
 * Example: Real-time anomaly monitoring
 */
export class AnomalyMonitoringService {
  private anomalyDetector: AnomalyDetector;
  private eventPredictor: EventPredictor;
  private alertManager: AlertManager;

  constructor() {
    this.anomalyDetector = new AnomalyDetector({
      flashCrashThreshold: 0.05,
      volumeSpikeThreshold: 3.0,
      liquidityDropThreshold: 0.5,
      anomalyThreshold: 0.7,
    });

    this.eventPredictor = new EventPredictor();

    this.alertManager = new AlertManager({
      duplicateWindow: 300000, // 5 minutes
      maxHistorySize: 1000,
      escalationRules: [
        {
          condition: { severity: 'CRITICAL' },
          action: 'IMMEDIATE_NOTIFICATION',
          delay: 0,
        },
      ],
    });
  }

  /**
   * Process incoming market data for anomalies
   */
  async processMarketData(symbol: string, ohlcv: OHLCV[]): Promise<void> {
    try {
      const marketData: MarketData = {
        symbol,
        timestamp: new Date(),
        ohlcv,
        recentHistory: [],
        volume: ohlcv[ohlcv.length - 1].volume,
        price: ohlcv[ohlcv.length - 1].close,
      };

      // 1. Detect anomalies
      const anomalyResult = this.anomalyDetector.detectAnomaly(marketData);
      
      if (anomalyResult.isAnomaly) {
        await this.alertManager.sendAlert({
          id: `anomaly-${Date.now()}`,
          type: 'ANOMALY_DETECTED',
          severity: anomalyResult.severity,
          timestamp: new Date(),
          data: anomalyResult,
          acknowledged: false,
          message: `Anomaly detected in ${symbol}: Score ${anomalyResult.anomalyScore.toFixed(2)}`,
        });
      }

      // 2. Check for flash crash
      const flashCrashAlert = this.anomalyDetector.detectFlashCrash(ohlcv);
      if (flashCrashAlert) {
        await this.alertManager.sendCriticalAlert({
          ...flashCrashAlert,
          id: `flash-crash-${Date.now()}`,
          data: flashCrashAlert,
          acknowledged: false,
          message: `Flash crash detected in ${symbol}!`,
          escalated: false,
        });
      }

      // 3. Check for regime changes
      if (ohlcv.length >= 200) {
        const regimeChange = this.anomalyDetector.detectRegimeChange(ohlcv);
        if (regimeChange) {
          await this.alertManager.sendAlert({
            id: `regime-${Date.now()}`,
            type: 'REGIME_CHANGE',
            severity: regimeChange.severity,
            timestamp: new Date(),
            data: regimeChange,
            acknowledged: false,
            message: `Market regime changed for ${symbol}: ${regimeChange.previousRegime} → ${regimeChange.newRegime}`,
          });
        }
      }

      // 4. Predict market events
      const eventPrediction = await this.eventPredictor.predictEvent(ohlcv);
      if (eventPrediction.probability > 0.7) {
        await this.alertManager.sendAlert({
          id: `event-pred-${Date.now()}`,
          type: 'EVENT_PREDICTED',
          severity: eventPrediction.probability > 0.8 ? 'HIGH' : 'MEDIUM',
          timestamp: new Date(),
          data: eventPrediction,
          acknowledged: false,
          message: `High probability ${eventPrediction.eventType} event predicted for ${symbol}`,
        });
      }
    } catch (error) {
      console.error('Error processing market data:', error);
    }
  }

  /**
   * Get alert summary
   */
  getAlertSummary(timeWindow: number = 3600000): {
    recent: number;
    critical: number;
    aggregated: ReturnType<AlertManager['aggregateAlerts']>;
  } {
    const aggregated = this.alertManager.aggregateAlerts(timeWindow);
    const recent = aggregated.reduce((sum, a) => sum + a.count, 0);
    const critical = aggregated.filter(a => a.severity === 'CRITICAL').length;

    return { recent, critical, aggregated };
  }

  /**
   * Analyze portfolio risk
   */
  async analyzePortfolioRisk(portfolio: {
    assets: Array<{
      symbol: string;
      quantity: number;
      entryPrice: number;
      currentPrice: number;
      returns: number[];
    }>;
  }): Promise<{
    tailRisk: ReturnType<EventPredictor['assessTailRisk']>;
    correlation: ReturnType<EventPredictor['analyzeRiskCorrelation']>;
  }> {
    const assetsWithGetReturns = portfolio.assets.map(a => ({
      ...a,
      getReturns: () => a.returns,
    }));

    // Convert to required format
    const portfolioData = {
      assets: assetsWithGetReturns,
      totalValue: portfolio.assets.reduce((sum, a) => sum + a.quantity * a.currentPrice, 0),
      cash: 0,
      getHistoricalReturns: () => {
        // Aggregate returns across all assets
        const allReturns: number[] = [];
        portfolio.assets.forEach(asset => {
          allReturns.push(...asset.returns);
        });
        return allReturns;
      },
    };

    const tailRisk = this.eventPredictor.assessTailRisk(portfolioData);
    const correlation = this.eventPredictor.analyzeRiskCorrelation(assetsWithGetReturns);

    return { tailRisk, correlation };
  }
}

/**
 * Example usage
 */
export async function exampleUsage(): Promise<void> {
  const service = new AnomalyMonitoringService();

  // Example market data
  const ohlcv: OHLCV[] = Array.from({ length: 250 }, (_, i) => ({
    date: new Date(Date.now() - (250 - i) * 86400000).toISOString(),
    open: 100 + i * 0.1,
    high: 105 + i * 0.1,
    low: 95 + i * 0.1,
    close: 100 + i * 0.1,
    volume: 1000000,
  }));

  // Process market data
  await service.processMarketData('AAPL', ohlcv);

  // Get alert summary
  const summary = service.getAlertSummary();

  // Analyze portfolio
  const portfolioRisk = await service.analyzePortfolioRisk({
    assets: [
      {
        symbol: 'AAPL',
        quantity: 100,
        entryPrice: 150,
        currentPrice: 155,
        returns: Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.02),
      },
      {
        symbol: 'GOOGL',
        quantity: 50,
        entryPrice: 2800,
        currentPrice: 2850,
        returns: Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.02),
      },
    ],
  });

}
