import { Alert, AlertSeverity, AlertType, AlertActionable } from './alertTypes';
import { ALERT_SYSTEM } from './constants/api';
import { ALERT_UI } from './constants/ui';

export class AlertService {
  private static instance: AlertService;

  private alerts: Alert[] = [];
  private settings = {
    enabled: true,
    types: {
      MARKET: true,
      STOCK: true,
      COMPOSITE: true,
    },
    severities: {
      HIGH: true,
      MEDIUM: true,
      LOW: true,
    },
  };

  private constructor() {
    this.alerts = [];
    this.settings = {
      enabled: true,
      types: {
        MARKET: true,
        STOCK: true,
        COMPOSITE: true,
      },
      severities: {
        HIGH: true,
        MEDIUM: true,
        LOW: true,
      },
    };
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * Resets the service state (alerts and settings) to defaults.
   * Useful for testing cleanup.
   */
  public reset(): void {
    this.alerts = [];
    this.settings = {
      enabled: true,
      types: {
        MARKET: true,
        STOCK: true,
        COMPOSITE: true,
      },
      severities: {
        HIGH: true,
        MEDIUM: true,
        LOW: true,
      },
    };
  }

  generateId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateSeverity(
    marketImpact: number,
    stockSignalStrength: number
  ): AlertSeverity {
    const weightedScore = (marketImpact * 0.4) + (stockSignalStrength * 0.6);

    if (weightedScore >= ALERT_SYSTEM.SEVERITY_HIGH_THRESHOLD) return 'HIGH';
    if (weightedScore >= ALERT_SYSTEM.SEVERITY_MEDIUM_THRESHOLD) return 'MEDIUM';
    return 'LOW';
  }

  shouldTriggerCompositeAlert(
    marketTrend: 'UP' | 'DOWN' | 'NEUTRAL',
    stockSignal: 'BUY' | 'SELL' | 'HOLD',
    correlation: number
  ): boolean {
    if (Math.abs(correlation) < ALERT_SYSTEM.CORRELATION_STRONG_THRESHOLD) return false;

    if (correlation > ALERT_SYSTEM.CORRELATION_STRONG_THRESHOLD) {
      return (
        (marketTrend === 'UP' && stockSignal === 'BUY') ||
        (marketTrend === 'DOWN' && stockSignal === 'SELL')
      );
    } else if (correlation < -ALERT_SYSTEM.CORRELATION_STRONG_THRESHOLD) {
      return (
        (marketTrend === 'UP' && stockSignal === 'SELL') ||
        (marketTrend === 'DOWN' && stockSignal === 'BUY')
      );
    }
    return false;
  }

  createMarketAlert(data: {
    symbol: string;
    trend: 'UP' | 'DOWN' | 'NEUTRAL';
    changePercent: number;
  }): Alert | null {
    if (!this.settings.enabled || !this.settings.types.MARKET) return null;

    const { symbol, trend, changePercent } = data;

    let severity: AlertSeverity = 'MEDIUM';
    if (Math.abs(changePercent) >= ALERT_SYSTEM.PRICE_CHANGE_HIGH_THRESHOLD) {
      severity = 'HIGH';
    }

    const message =
      trend === 'UP'
        ? `${symbol}が+${changePercent.toFixed(2)}%急騰。上昇トレンド継続中。`
        : trend === 'DOWN'
          ? `${symbol}が-${Math.abs(changePercent).toFixed(2)}%急落。下降トレンド継続中。`
          : `${symbol}は横ばい状態。${changePercent.toFixed(2)}%変動。`;

    const alert: Alert = {
      id: this.generateId(),
      type: 'MARKET',
      severity,
      symbol,
      title: `市場トレンド変化: ${symbol}`,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    return this.shouldAlert(severity) ? alert : null;
  }

  createStockAlert(data: {
    symbol: string;
    alertType: 'BREAKOUT' | 'FORECAST_CHANGE' | 'ACCURACY_DROP' | 'TREND_REVERSAL';
    details: {
      price?: number;
      level?: 'strong' | 'medium' | 'weak';
      levelType?: 'support' | 'resistance';
      confidence?: number;
      previousConfidence?: number;
      hitRate?: number;
    };
  }): Alert | null {
    if (!this.settings.enabled || !this.settings.types.STOCK) return null;

    const { symbol, alertType, details } = data;

    let severity: AlertSeverity = 'MEDIUM';
    let title = '';
    let message = '';
    let actionable: AlertActionable | undefined;

    switch (alertType) {
      case 'BREAKOUT':
        if (details.level === 'strong') severity = 'HIGH';
        title = `ブレイクアウト検知: ${symbol}`;
        message = `${details.price?.toFixed(2)}で${details.level}な${details.levelType}ラインを突破。出来高確認要。`;
        actionable = {
          type: details.levelType === 'support' ? 'BUY' : 'SELL',
          confidence: details.confidence || 75,
          targetPrice: details.price ? details.price * 1.03 : undefined,
          stopLoss: details.price,
        };
        break;

      case 'FORECAST_CHANGE':
        const confidenceChange = details.previousConfidence
          ? ((details.confidence || 0) - details.previousConfidence) / details.previousConfidence
          : 0;

        if (Math.abs(confidenceChange) >= ALERT_SYSTEM.CONFIDENCE_CHANGE_HIGH_THRESHOLD) severity = 'HIGH';
        else if (Math.abs(confidenceChange) >= ALERT_SYSTEM.CONFIDENCE_CHANGE_MEDIUM_THRESHOLD) severity = 'MEDIUM';
        else severity = 'LOW';

        const changeText = confidenceChange > 0 ? '上昇' : '低下';
        title = `予測コーン信頼度${changeText}: ${symbol}`;
        message = `信頼度が${details.previousConfidence?.toFixed(0)}%から${details.confidence?.toFixed(0)}%へ${changeText}。`;
        break;

      case 'ACCURACY_DROP':
        if ((details.hitRate || 0) < ALERT_SYSTEM.ACCURACY_HIGH_THRESHOLD) severity = 'HIGH';
        else if ((details.hitRate || 0) < ALERT_SYSTEM.ACCURACY_MEDIUM_THRESHOLD) severity = 'MEDIUM';
        else severity = 'LOW';

        title = `的中率急低下: ${symbol}`;
        message = `過去的中率が${details.hitRate?.toFixed(0)}%に低下。AIパラメータ最適化要。`;
        break;

      case 'TREND_REVERSAL':
        severity = 'HIGH';
        title = `トレンド反転警告: ${symbol}`;
        message = `RSI・SMAがシグナル反転。注視要。`;
        actionable = {
          type: 'HOLD',
          confidence: ALERT_UI.ACTIONABLE_CONFIDENCE,
        };
        break;
    }

    const alert: Alert = {
      id: this.generateId(),
      type: 'STOCK',
      severity,
      symbol,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      actionable,
    };

    return this.shouldAlert(severity) ? alert : null;
  }

  createCompositeAlert(data: {
    symbol: string;
    marketTrend: 'UP' | 'DOWN' | 'NEUTRAL';
    stockSignal: 'BUY' | 'SELL' | 'HOLD';
    correlation: number;
  }): Alert | null {
    if (!this.settings.enabled || !this.settings.types.COMPOSITE) return null;

    const { symbol, marketTrend, stockSignal, correlation } = data;

    if (!this.shouldTriggerCompositeAlert(marketTrend, stockSignal, correlation)) {
      return null;
    }

    const severity = this.calculateSeverity(80, 85);

    const correlationText =
      Math.abs(correlation) >= ALERT_SYSTEM.CORRELATION_WEAK_THRESHOLD ? '強い相関' :
        Math.abs(correlation) >= ALERT_SYSTEM.CORRELATION_STRONG_THRESHOLD ? '中程度の相関' : '弱い相関';

    const message =
      marketTrend === 'UP' && stockSignal === 'BUY'
        ? `市場上昇トレンド（${correlationText}）とBUYシグナルが一致。強気複合シグナル発生。`
        : marketTrend === 'DOWN' && stockSignal === 'SELL'
          ? `市場下降トレンド（${correlationText}）とSELLシグナルが一致。弱気複合シグナル発生。`
          : `市場${marketTrend}トレンドと${stockSignal}シグナルが交差。`;

    const alert: Alert = {
      id: this.generateId(),
      type: 'COMPOSITE',
      severity,
      symbol,
      title: `複合シグナル: ${symbol}`,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      actionable: {
        type: stockSignal,
        confidence: ALERT_UI.CONFIDENCE_HIGH_THRESHOLD + 25,
        targetPrice: undefined,
        stopLoss: undefined,
      },
    };

    return this.shouldAlert(severity) ? alert : null;
  }

  acknowledgeAlert(id: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  clearAcknowledged(): void {
    this.alerts = this.alerts.filter(a => !a.acknowledged);
  }

  addAlert(alert: Alert): void {
    if (!this.shouldAlert(alert.severity)) return;

    this.alerts.unshift(alert);

    if (this.alerts.length > ALERT_SYSTEM.MAX_ALERT_HISTORY) {
      this.alerts = this.alerts.slice(0, ALERT_SYSTEM.MAX_ALERT_HISTORY);
    }
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  getUnreadCount(): number {
    return this.alerts.filter(a => !a.acknowledged).length;
  }

  private shouldAlert(severity: AlertSeverity): boolean {
    return this.settings.severities[severity];
  }
}

export const alertService = AlertService.getInstance();
