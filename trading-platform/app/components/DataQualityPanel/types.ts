export interface DataQualityPanelProps {
  /** コンパクトモード */
  compact?: boolean;
  /** 更新間隔（ミリ秒） */
  updateInterval?: number;
}

export interface DataSourceHealth {
  source: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  lastUpdate: number;
  qualityScore: number;
}

export interface QualityMetrics {
  overallScore: number;
  dataFreshness: 'excellent' | 'good' | 'fair' | 'poor';
  cachePerformance: 'excellent' | 'good' | 'fair' | 'poor';
  anomalyCount: number;
  validationPassRate: number;
}
