/**
 * Prediction Clouds Chart Component
 * 
 * ATRに基づく株価予測雲を表示するReactコンポーネント
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/app/lib/utils';
import { PredictionCloudResult, PredictionCloudConfig, RISK_BASED_STYLES } from '../lib/prediction-clouds/types';
import { calculatePredictionClouds } from '../lib/prediction-clouds/calculator';
import { OHLCV } from '../types';

interface PredictionCloudsChartProps {
  /** 銘柄シンボル */
  symbol: string;
  /** 株価データ */
  data: OHLCV[];
  /** 設定（オプション） */
  config?: Partial<PredictionCloudConfig>;
  /** 追加のクラス名 */
  className?: string;
  /** チャートの高さ */
  height?: number;
  /** 表示モード */
  mode?: 'compact' | 'full';
}

/**
 * 予測雲チャートコンポーネント
 */
export function PredictionCloudsChart({
  symbol,
  data,
  config,
  className,
  height = 400,
  mode = 'full',
}: PredictionCloudsChartProps) {
  const [selectedMultiplier, setSelectedMultiplier] = useState<'conservative' | 'standard' | 'aggressive'>('standard');
  
  // 予測雲を計算
  const cloudResult = useMemo(() => {
    try {
      return calculatePredictionClouds(data, symbol, config);
    } catch (error) {
      console.error('Failed to calculate prediction clouds:', error);
      return null;
    }
  }, [data, symbol, config]);

  // チャート用データを準備
  const chartData = useMemo(() => {
    if (!cloudResult) return [];
    
    return cloudResult.clouds.map(cloud => ({
      date: cloud.date,
      timestamp: cloud.timestamp,
      center: cloud.center,
      upper: cloud.upper,
      lower: cloud.lower,
      confidence: cloud.confidence,
      isForecast: cloudResult.forecastClouds.includes(cloud),
    }));
  }, [cloudResult]);

  // 現在価格のインデックスを取得
  const currentPriceIndex = useMemo(() => {
    if (!cloudResult) return -1;
    return chartData.findIndex(d => !d.isForecast) + cloudResult.historicalClouds.length - 1;
  }, [chartData, cloudResult]);

  // スタイルを取得
  const style = useMemo(() => {
    if (!cloudResult) return RISK_BASED_STYLES.MODERATE;
    return RISK_BASED_STYLES[cloudResult.summary.volatilityAssessment];
  }, [cloudResult]);

  if (!cloudResult || chartData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-900 rounded-lg", className)} style={{ height }}>
        <p className="text-slate-400">予測データを計算中...</p>
      </div>
    );
  }

  const { summary, currentPrice, currentATR } = cloudResult;

  return (
    <div className={cn("space-y-4", className)}>
      {/* ヘッダー情報 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {symbol} 価格予測雲
          </h3>
          <p className="text-sm text-slate-400">
            現在: ¥{currentPrice.toLocaleString()} | ATR: ¥{currentATR.toFixed(2)}
          </p>
        </div>
        
        {/* リスクインジケーター */}
        <RiskIndicator summary={summary} />
      </div>

      {/* 倍率選択ボタン */}
      {mode === 'full' && (
        <div className="flex gap-2">
          <MultiplierButton
            label="保守的"
            description="68%信頼区間"
            selected={selectedMultiplier === 'conservative'}
            onClick={() => setSelectedMultiplier('conservative')}
          />
          <MultiplierButton
            label="標準"
            description="87%信頼区間"
            selected={selectedMultiplier === 'standard'}
            onClick={() => setSelectedMultiplier('standard')}
          />
          <MultiplierButton
            label="楽観的"
            description="95%信頼区間"
            selected={selectedMultiplier === 'aggressive'}
            onClick={() => setSelectedMultiplier('aggressive')}
          />
        </div>
      )}

      {/* チャート */}
      <div className="bg-slate-900 rounded-lg p-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value: string) => format(new Date(value), 'MM/dd', { locale: ja })}
              stroke="#475569"
            />

            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value: number) => `¥${value.toLocaleString()}`}
              stroke="#475569"
              domain={['auto', 'auto']}
            />
            
            <Tooltip
              content={({ active, payload, label }: TooltipProps<number, string>) => {
                if (!active || !payload || payload.length === 0) return null;

                const data = payload[0].payload as { date: string; timestamp: number; center: number; upper: number; lower: number; confidence: number; isForecast: boolean };
                const isForecast = data.isForecast;

                return (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                    <p className="text-slate-300 text-sm mb-2">
                      {format(new Date(label as string), 'yyyy年MM月dd日', { locale: ja })}
                      {isForecast && (
                        <span className="ml-2 text-amber-400 text-xs">予測</span>
                      )}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-white">
                        中心: ¥{data.center.toLocaleString()}
                      </p>
                      <p className="text-emerald-400">
                        上限: ¥{data.upper.toLocaleString()}
                      </p>
                      <p className="text-rose-400">
                        下限: ¥{data.lower.toLocaleString()}
                      </p>
                      <p className="text-blue-400">
                        信頼度: {data.confidence.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              }}
            />

            {/* 予測雲（Area） */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill={style.fillColor}
              fillOpacity={style.fillOpacity}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="#0f172a"
              fillOpacity={1}
            />

            {/* 中心線 */}
            <Line
              type="monotone"
              dataKey="center"
              stroke={style.centerLineColor}
              strokeWidth={2}
              dot={false}
              strokeDasharray={currentPriceIndex > 0 ? `${currentPriceIndex} 1000` : undefined}
            />

            {/* 現在価格の区切り線 */}
            {currentPriceIndex > 0 && (
              <ReferenceLine
                x={chartData[currentPriceIndex]?.date}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: '現在',
                  fill: '#f59e0b',
                  fontSize: 12,
                  position: 'top',
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* サマリー情報 */}
      {mode === 'full' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="予測範囲"
            value={`±${summary.expectedRangePercent.toFixed(1)}%`}
            description="今後5日間の予測変動幅"
          />
          <SummaryCard
            label="トレンド"
            value={summary.trendDirection === 'UP' ? '上昇' : summary.trendDirection === 'DOWN' ? '下降' : 'もみ合い'}
            description="現在の価格トレンド"
            color={summary.trendDirection === 'UP' ? 'text-emerald-400' : summary.trendDirection === 'DOWN' ? 'text-rose-400' : 'text-slate-400'}
          />
          <SummaryCard
            label="ボラティリティ"
            value={getVolatilityLabel(summary.volatilityAssessment)}
            description="価格変動の激しさ"
            color={getVolatilityColor(summary.volatilityAssessment)}
          />
          <SummaryCard
            label="リスクスコア"
            value={`${summary.riskScore}/100`}
            description="0=安全、100=高リスク"
            color={getRiskColor(summary.riskScore)}
          />
        </div>
      )}

      {/* 説明 */}
      <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
        <p className="mb-2">
          <strong className="text-white">予測雲（Prediction Clouds）</strong>は、
          ATR（平均真波幅）に基づいて計算された価格予測範囲を示しています。
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>緑/青/橙/赤の雲は、それぞれ低/中/高/極端なボラティリティを示します</li>
          <li>点線以降は未来の予測値（5営業日先まで）</li>
          <li>範囲が広いほど不確実性が高く、信頼区間は広くなります</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * リスクインジケーターコンポーネント
 */
function RiskIndicator({ summary }: { summary: PredictionCloudResult['summary'] }) {
  const { volatilityAssessment, riskScore } = summary;
  
  const colorClass = {
    LOW: 'bg-emerald-500',
    MODERATE: 'bg-blue-500',
    HIGH: 'bg-amber-500',
    EXTREME: 'bg-rose-500',
  }[volatilityAssessment];

  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-3 h-3 rounded-full", colorClass)} />
      <div className="text-right">
        <p className="text-xs text-slate-400">リスクレベル</p>
        <p className={cn("text-sm font-medium", getVolatilityColor(volatilityAssessment))}>
          {getVolatilityLabel(volatilityAssessment)}
        </p>
      </div>
      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${riskScore}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 倍率選択ボタン
 */
function MultiplierButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
        selected
          ? "bg-blue-600 text-white shadow-lg"
          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
      )}
    >
      <span className="block">{label}</span>
      <span className="block text-xs opacity-70">{description}</span>
    </button>
  );
}

/**
 * サマリーカード
 */
function SummaryCard({
  label,
  value,
  description,
  color = 'text-white',
}: {
  label: string;
  value: string;
  description: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={cn("text-lg font-bold", color)}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}

/**
 * ボラティリティラベルを取得
 */
function getVolatilityLabel(assessment: string): string {
  const labels: Record<string, string> = {
    LOW: '低',
    MODERATE: '中',
    HIGH: '高',
    EXTREME: '極端',
  };
  return labels[assessment] || assessment;
}

/**
 * ボラティリティ色を取得
 */
function getVolatilityColor(assessment: string): string {
  const colors: Record<string, string> = {
    LOW: 'text-emerald-400',
    MODERATE: 'text-blue-400',
    HIGH: 'text-amber-400',
    EXTREME: 'text-rose-400',
  };
  return colors[assessment] || 'text-slate-400';
}

/**
 * リスクスコアに応じた色を取得
 */
function getRiskColor(score: number): string {
  if (score < 30) return 'text-emerald-400';
  if (score < 50) return 'text-blue-400';
  if (score < 70) return 'text-amber-400';
  return 'text-rose-400';
}
