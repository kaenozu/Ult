import { Signal } from '@/app/types/signal';

interface RegimeInfo {
  trendStrength: number;
}

export class ConfidenceScorer {
  score(signal: Signal, regimeInfo: RegimeInfo): number {
    let confidence = signal.confidence <= 1 
      ? signal.confidence * 100 
      : signal.confidence;
    
    if (signal.accuracy && signal.accuracy > 50) {
      confidence += (signal.accuracy - 50) * 0.2;
    }
    
    if (regimeInfo.trendStrength > 50) {
      confidence += 5;
    }
    
    return Math.min(100, Math.max(0, confidence));
  }

  getConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score > 70) return 'HIGH';
    if (score > 50) return 'MEDIUM';
    return 'LOW';
  }
}
