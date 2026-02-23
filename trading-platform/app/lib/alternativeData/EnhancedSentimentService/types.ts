import { AggregatedSentiment } from '../../sentiment/SentimentAnalysisEngine';

export interface InvestorSentiment {
  institutional: number;
  retail: number;
  combined: number;
  divergence: number;
}

export interface SentimentLeadingIndicator {
  volumeAnomaly: number;
  trendAcceleration: number;
  crossAssetSentiment: number;
  earlySignalStrength: number;
}

export interface EnhancedSentimentResult {
  symbol: string;
  timestamp: number;
  overallSentiment: AggregatedSentiment;
  investorSentiment: InvestorSentiment;
  leadingIndicators: SentimentLeadingIndicator;
  weightedScores: {
    news: number;
    social: number;
    analyst: number;
    economic: number;
  };
  confidence: number;
  dataQuality: number;
  recommendedAction: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  actionConfidence: number;
  marketContext: {
    volatility: number;
    momentum: number;
    regime: 'TRENDING' | 'RANGING' | 'VOLATILE';
  };
}

export interface EnhancedSentimentConfig {
  updateInterval: number;
  dataWeights: {
    news: number;
    social: number;
    analyst: number;
    economic: number;
  };
  divergenceThreshold: number;
  leadingIndicatorSensitivity: number;
}

export const DEFAULT_CONFIG: EnhancedSentimentConfig = {
  updateInterval: 60000,
  dataWeights: { news: 0.35, social: 0.25, analyst: 0.25, economic: 0.15 },
  divergenceThreshold: 0.4,
  leadingIndicatorSensitivity: 0.7
};

class EventEmitter {
  private events: Map<string, Function[]> = new Map();
  on(event: string, listener: Function): void {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(listener);
  }
  emit(event: string, ...args: unknown[]): void {
    const listeners = this.events.get(event);
    if (listeners) listeners.forEach(listener => listener(...args));
  }
  removeAllListeners(event?: string): void {
    if (event) this.events.delete(event);
    else this.events.clear();
  }
}

export { EventEmitter };
