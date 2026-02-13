/**
 * モデルドリフト検知器
 * 予測精度の低下を検知し、再学習のトリガーを提供します。
 */
export interface DriftResult {
  hasDrift: boolean;
  severity: 'low' | 'medium' | 'high';
  currentError: number;
  baselineError: number;
}

export class DriftDetector {
  private threshold: number;
  private minWindowSize: number;

  constructor(config: { threshold: number; minWindowSize: number }) {
    this.threshold = config.threshold;
    this.minWindowSize = config.minWindowSize;
  }

  /**
   * 二乗平均平方根誤差(RMSE)などの誤差履歴からドリフトを判定する
   */
  checkDrift(errorHistory: number[]): DriftResult {
    const windowSize = this.minWindowSize;
    if (errorHistory.length < windowSize * 2) {
      return { hasDrift: false, severity: 'low', currentError: 0, baselineError: 0 };
    }

    // Use latest windowSize as recent, and everything before as baseline (up to windowSize*2)
    const recent = errorHistory.slice(-windowSize);
    const baseline = errorHistory.slice(-(windowSize * 2), -windowSize);

    const avgBaseline = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;

    const diff = avgRecent - avgBaseline;
    const hasDrift = diff > this.threshold;
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (diff > this.threshold * 2) severity = 'high';
    else if (diff > this.threshold) severity = 'medium';

    return {
      hasDrift,
      severity,
      currentError: avgRecent,
      baselineError: avgBaseline
    };
  }
}
