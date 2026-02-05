/**
 * ML Performance Monitoring Dashboard
 * 
 * Displays real-time ML model performance metrics including:
 * - Hit rates per model
 * - Sharpe ratios
 * - Model drift status
 * - Dynamic ensemble weights
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { integratedPredictionService } from '@/app/domains/prediction/services/integrated-prediction-service';
import ConfirmationModal from './ConfirmationModal';

interface PerformanceData {
  hitRates: { rf: number; xgb: number; lstm: number };
  sharpeRatios: { rf: number; xgb: number; lstm: number };
  averageErrors: { rf: number; xgb: number; lstm: number };
  driftStatus: {
    driftDetected: boolean;
    daysSinceRetrain: number;
    psi: number;
  };
  ensembleWeights?: {
    RF: number;
    XGB: number;
    LSTM: number;
  };
}

export default function MLPerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRetrainModal, setShowRetrainModal] = useState(false);

  // Fetch metrics from service - returns data without setting state
  const getMetrics = useCallback(() => {
    try {
      return integratedPredictionService.getPerformanceMetrics();
    } catch (error) {
      console.error('Error fetching performance data:', error);
      return null;
    }
  }, []);

  const fetchPerformanceData = useCallback(() => {
    const metrics = getMetrics();
    if (metrics) {
      setPerformanceData(metrics);
    }
    setLoading(false);
  }, [getMetrics]);

  useEffect(() => {
    // Update every 30 seconds - use interval callback to avoid sync setState
    const interval = setInterval(() => {
      fetchPerformanceData();
    }, 30000);

    // Initial fetch - wrapped in setTimeout to avoid sync setState
    setTimeout(() => {
      fetchPerformanceData();
    }, 0);

    return () => clearInterval(interval);
  }, [fetchPerformanceData]);

  const handleRetrain = async () => {
    try {
      await integratedPredictionService.retrainModels();
      const metrics = getMetrics();
      if (metrics) {
        setPerformanceData(metrics);
      }
      setShowRetrainModal(false);
      // Show success message (could be replaced with toast notification)
      alert('モデルの再トレーニングが完了しました');
    } catch (error) {
      console.error('Error retraining models:', error);
      alert('再トレーニング中にエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a2332] border border-cyan-500/30 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-cyan-400 mb-4">MLモデル性能モニタリング</h2>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!performanceData) {
    return null;
  }

  const { hitRates, sharpeRatios, averageErrors, driftStatus } = performanceData;

  // Calculate average hit rate
  const avgHitRate = (hitRates.rf + hitRates.xgb + hitRates.lstm) / 3;
  const avgSharpe = (sharpeRatios.rf + sharpeRatios.xgb + sharpeRatios.lstm) / 3;

  // Determine overall health status
  const getHealthStatus = () => {
    if (driftStatus.driftDetected) return { text: '要注意', color: 'text-red-400' };
    if (avgHitRate >= 0.6) return { text: '良好', color: 'text-green-400' };
    if (avgHitRate >= 0.5) return { text: '標準', color: 'text-yellow-400' };
    return { text: '低下', color: 'text-orange-400' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="bg-[#1a2332] border border-cyan-500/30 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-cyan-400">
          MLモデル性能モニタリング
        </h2>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-semibold ${healthStatus.color}`}>
            ステータス: {healthStatus.text}
          </span>
          <button
            onClick={() => setShowRetrainModal(true)}
            className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-400 text-sm transition-colors"
          >
            再トレーニング
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Hit Rate */}
        <div className="bg-[#0f1922] border border-cyan-500/20 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">平均ヒット率</div>
          <div className="text-2xl font-bold text-cyan-400">
            {(avgHitRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            目標: 60%以上
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                avgHitRate >= 0.6 ? 'bg-green-500' : avgHitRate >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(avgHitRate * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Average Sharpe Ratio */}
        <div className="bg-[#0f1922] border border-cyan-500/20 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">平均シャープレシオ</div>
          <div className="text-2xl font-bold text-cyan-400">
            {avgSharpe.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            目標: 1.5以上
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                avgSharpe >= 1.5 ? 'bg-green-500' : avgSharpe >= 1.0 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((avgSharpe / 2) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Drift Status */}
        <div className="bg-[#0f1922] border border-cyan-500/20 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">ドリフトステータス</div>
          <div className={`text-2xl font-bold ${driftStatus.driftDetected ? 'text-red-400' : 'text-green-400'}`}>
            {driftStatus.driftDetected ? '検出' : '正常'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            最終トレーニング: {driftStatus.daysSinceRetrain}日前
          </div>
          {driftStatus.driftDetected && (
            <div className="mt-2 text-xs text-red-400">
              ⚠️ 再トレーニングを推奨
            </div>
          )}
        </div>
      </div>

      {/* Individual Model Performance */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">個別モデル性能</h3>
        
        {/* Random Forest */}
        <ModelPerformanceRow
          name="Random Forest"
          hitRate={hitRates.rf}
          sharpeRatio={sharpeRatios.rf}
          avgError={averageErrors.rf}
        />

        {/* XGBoost */}
        <ModelPerformanceRow
          name="XGBoost"
          hitRate={hitRates.xgb}
          sharpeRatio={sharpeRatios.xgb}
          avgError={averageErrors.xgb}
        />

        {/* LSTM */}
        <ModelPerformanceRow
          name="LSTM"
          hitRate={hitRates.lstm}
          sharpeRatio={sharpeRatios.lstm}
          avgError={averageErrors.lstm}
        />
      </div>

      {/* Success Metrics Progress */}
      <div className="border-t border-cyan-500/20 pt-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">目標達成度</h3>
        
        <MetricProgress
          label="予測ヒット率"
          current={avgHitRate * 100}
          target={60}
          unit="%"
        />
        
        <MetricProgress
          label="シャープレシオ"
          current={avgSharpe}
          target={1.5}
          unit=""
        />
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-500 border-t border-cyan-500/20 pt-4">
        <p>
          このダッシュボードは、機械学習モデルのリアルタイム性能を追跡します。
          モデルドリフトが検出された場合、再トレーニングを実行してください。
        </p>
      </div>

      {/* Retrain Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRetrainModal}
        onConfirm={handleRetrain}
        onCancel={() => setShowRetrainModal(false)}
        title="モデル再トレーニング"
        message="モデルを再トレーニングしますか？これにより性能履歴がリセットされますが、最新のデータで最適化されたモデルが生成されます。"
        confirmText="再トレーニング"
        cancelText="キャンセル"
      />
    </div>
  );
}

// Model Performance Row Component
function ModelPerformanceRow({
  name,
  hitRate,
  sharpeRatio,
  avgError,
}: {
  name: string;
  hitRate: number;
  sharpeRatio: number;
  avgError: number;
}) {
  return (
    <div className="bg-[#0f1922] border border-cyan-500/20 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300">{name}</span>
        <span className={`text-sm font-semibold ${hitRate >= 0.6 ? 'text-green-400' : 'text-yellow-400'}`}>
          {(hitRate * 100).toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500">Sharpe</div>
          <div className="text-gray-300">{sharpeRatio.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500">平均誤差</div>
          <div className="text-gray-300">{avgError.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500">ヒット率</div>
          <div className="text-gray-300">{(hitRate * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}

// Metric Progress Component
function MetricProgress({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const percentage = Math.min((current / target) * 100, 100);
  const isOnTarget = current >= target;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={isOnTarget ? 'text-green-400' : 'text-yellow-400'}>
          {current.toFixed(1)}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isOnTarget ? 'bg-green-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

