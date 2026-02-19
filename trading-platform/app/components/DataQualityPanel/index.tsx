'use client';

/**
 * DataQualityPanel/index.tsx
 *
 * データ品質ダッシュボードコンポーネント
 * TRADING-027: データ品質の可視化
 *
 * 既存のデータ品質システム（DataQualityValidator, DataLatencyMonitor, SmartDataCache）
 * を統合した可視化を提供します。
 *
 * @example
 * // Full mode
 * <DataQualityPanel />
 *
 * @example
 * // Compact mode
 * <DataQualityPanel compact />
 *
 * @example
 * // Custom update interval
 * <DataQualityPanel updateInterval={5000} />
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  SignalHigh,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { DataQualityPanelProps } from './types';
import { getQualityColor, getQualityBg } from './utils';
import { useDataQuality } from './hooks/useDataQuality';
import { MetricCard } from './components/MetricCard';
import { QualityProgressBar } from './components/QualityProgressBar';
import { DataSourceRow } from './components/DataSourceRow';

/**
 * データ品質ダッシュボードコンポーネント
 *
 * 市場データの品質、キャッシュパフォーマンス、データソースの健全性を
 * リアルタイムで監視および表示します。
 *
 * @param props - コンポーネントのプロパティ
 * @returns データ品質ダッシュボードUI
 */
export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  compact = false,
  updateInterval = 1000,
}) => {
  const {
    qualityMetrics,
    dataSources,
    cacheStats,
    anomalies,
    refresh
  } = useDataQuality(updateInterval);

  // コンパクトモード
  if (compact) {
    return (
      <div className="p-4 bg-[#141e27] rounded-lg border border-[#233648]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {qualityMetrics.overallScore >= 60 ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm font-bold text-white">データ品質</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#92adc9]">スコア</div>
            <div className={cn('text-lg font-bold', getQualityColor(qualityMetrics.overallScore))}>
              {qualityMetrics.overallScore.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  // フルモード
  return (
    <div className="p-6 bg-[#0f172a] rounded-lg border border-[#1e293b]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1e293b] rounded-lg">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">データ品質ダッシュボード</h2>
            <p className="text-[10px] text-[#92adc9]">
              HTTPベースのデータ品質監視
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="p-2 bg-[#1e293b] hover:bg-[#3730a3] rounded-lg transition-colors"
          title="更新"
        >
          <RefreshCw className="w-4 h-4 text-[#92adc9]" />
        </button>
      </div>

      {/* 全体スコア */}
      <div className="mb-6 p-4 bg-[#1a1a2e] rounded-lg border border-[#233648]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">全体品質スコア</h3>
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-bold',
            getQualityBg(qualityMetrics.overallScore),
            getQualityColor(qualityMetrics.overallScore)
          )}>
            {qualityMetrics.overallScore.toFixed(0)}%
          </div>
        </div>
        <QualityProgressBar score={qualityMetrics.overallScore} label="全体スコア" />
      </div>

      {/* メトリクスグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <MetricCard
          title="データ鮮度"
          value={qualityMetrics.dataFreshness === 'excellent' ? '優秀'
            : qualityMetrics.dataFreshness === 'good' ? '良好'
              : qualityMetrics.dataFreshness === 'fair' ? '普通'
                : '不良'}
          status={qualityMetrics.dataFreshness}
          icon={Clock}
        />
        <MetricCard
          title="キャッシュ効率"
          value={cacheStats.hitRate.toFixed(1)}
          unit="%"
          status={qualityMetrics.cachePerformance}
          icon={Database}
        />
        <MetricCard
          title="異常検知"
          value={anomalies.length}
          unit="件"
          status={anomalies.length === 0 ? 'excellent' : anomalies.length < 5 ? 'good' : 'poor'}
          icon={AlertTriangle}
        />
      </div>

      {/* データソース状態 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <SignalHigh className="w-4 h-4 text-[#92adc9]" />
          データソース状態
        </h3>
        <div className="space-y-2">
          {dataSources.map((source) => (
            <DataSourceRow key={source.source} name={source.source} health={source} />
          ))}
        </div>
      </div>

      {/* キャッシュ統計 */}
      <div className="mb-6 p-4 bg-[#1a1a2e] rounded-lg border border-[#233648]">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#92adc9]" />
          キャッシュパフォーマンス
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-[10px] text-[#92adc9] mb-1">ヒット率</div>
            <div className={cn(
              'text-lg font-bold',
              cacheStats.hitRate >= 0.9 ? 'text-green-400' :
                cacheStats.hitRate >= 0.7 ? 'text-blue-400' :
                  cacheStats.hitRate >= 0.5 ? 'text-yellow-400' :
                    'text-red-400'
            )}>
              {(cacheStats.hitRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#92adc9] mb-1">{cacheStats.size}/{cacheStats.maxSize}</div>
            <div className="text-sm font-bold text-white">使用中</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#92adc9] mb-1">排除</div>
            <div className="text-sm font-bold text-white">{cacheStats.evictions}</div>
          </div>
        </div>
        <QualityProgressBar
          score={cacheStats.hitRate * 100}
          label="キャッシュヒット率"
        />
      </div>

      {/* 異常アラート */}
      {
        anomalies.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-bold">検出された異常</span>
            </div>
            <ul className="space-y-1">
              {anomalies.slice(0, 5).map((anomaly, index) => (
                <li key={index} className="text-[10px] text-red-300">
                  • {anomaly}
                </li>
              ))}
              {anomalies.length > 5 && (
                <li className="text-[10px] text-[#92adc9]">
                  他 {anomalies.length - 5} 件...
                </li>
              )}
            </ul>
          </div>
        )
      }
    </div >
  );
};

export default DataQualityPanel;
