'use client';

import { memo, useMemo } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import type { ConnectionMetrics, WebSocketStatus } from '@/app/hooks/useResilientWebSocket';

interface ConnectionQualityIndicatorProps {
  status: WebSocketStatus;
  metrics: ConnectionMetrics | null;
  onReconnect?: () => void;
  compact?: boolean;
}

/**
 * Get signal strength icon based on connection quality
 */
function getSignalIcon(quality: ConnectionMetrics['quality']) {
  switch (quality) {
    case 'excellent':
      return SignalHigh;
    case 'good':
      return SignalMedium;
    case 'fair':
      return SignalLow;
    case 'poor':
      return SignalZero;
    case 'offline':
    default:
      return WifiOff;
  }
}

/**
 * Get color classes based on connection quality
 */
function getQualityColors(quality: ConnectionMetrics['quality']) {
  switch (quality) {
    case 'excellent':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        dot: 'bg-green-500',
      };
    case 'good':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        dot: 'bg-blue-500',
      };
    case 'fair':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        dot: 'bg-yellow-500',
      };
    case 'poor':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        dot: 'bg-orange-500',
      };
    case 'offline':
    default:
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        dot: 'bg-red-500',
      };
  }
}

/**
 * Get status label in Japanese
 */
function getStatusLabel(status: WebSocketStatus): string {
  switch (status) {
    case 'CONNECTING':
      return '接続中';
    case 'OPEN':
      return '接続済み';
    case 'RECONNECTING':
      return '再接続中';
    case 'FALLBACK':
      return 'フォールバック';
    case 'ERROR':
      return 'エラー';
    case 'CLOSING':
      return '切断中';
    case 'CLOSED':
      return '切断';
    default:
      return '不明';
  }
}

/**
 * Format latency for display
 */
function formatLatency(latency: number): string {
  if (!isFinite(latency) || latency === 0) return '-';
  return `${Math.round(latency)}ms`;
}

/**
 * Format uptime for display
 */
function formatUptime(uptime: number): string {
  if (uptime === 0) return '-';
  const seconds = Math.floor(uptime / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  return `${hours}時間${minutes % 60}分`;
}

/**
 * ConnectionQualityIndicator Component
 * 
 * Displays WebSocket connection status, quality metrics, and actions
 */
export const ConnectionQualityIndicator = memo(function ConnectionQualityIndicator({
  status,
  metrics,
  onReconnect,
  compact = false,
}: ConnectionQualityIndicatorProps) {
  // Determine quality based on connection status and metrics
  const quality = useMemo(() => {
    // If not connected, always show offline regardless of stale metrics
    if (status !== 'OPEN') {
      return 'offline';
    }
    
    // If connected, use metrics quality if available and not offline
    if (metrics?.quality && metrics.quality !== 'offline') {
      return metrics.quality;
    }
    
    // If connected but no quality data yet (no measurements), assume 'good'
    return 'good';
  }, [metrics, status]);
  
  const colors = useMemo(() => getQualityColors(quality), [quality]);
  const statusLabel = useMemo(() => getStatusLabel(status), [status]);

  // Render signal icon directly based on quality to avoid creating components during render
  const renderSignalIcon = () => {
    const iconClass = 'w-4 h-4';
    switch (quality) {
      case 'excellent':
        return <SignalHigh className={iconClass} />;
      case 'good':
        return <SignalMedium className={iconClass} />;
      case 'fair':
        return <SignalLow className={iconClass} />;
      case 'poor':
        return <SignalZero className={iconClass} />;
      case 'offline':
      default:
        return <WifiOff className={iconClass} />;
    }
  };

  // Compact view - just status badge
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all duration-300',
          colors.bg,
          colors.border,
          colors.text
        )}
      >
        <div className={cn('w-1.5 h-1.5 rounded-full', colors.dot, status === 'OPEN' && 'animate-pulse')} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{statusLabel}</span>
      </div>
    );
  }

  // Full view with metrics
  return (
    <div className="relative group">
      {/* Status Badge */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 cursor-pointer',
          colors.bg,
          colors.border,
          colors.text,
          'hover:shadow-lg'
        )}
      >
        {renderSignalIcon()}
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-bold uppercase tracking-wider">{statusLabel}</span>
          {metrics && status === 'OPEN' && (
            <span className="text-[9px] opacity-70">
              {formatLatency(metrics.avgLatency)} · {quality}
            </span>
          )}
        </div>
      </div>

      {/* Detailed Metrics Tooltip */}
      <div className="absolute top-full right-0 mt-2 w-72 bg-[#141e27] border border-[#233648] rounded-lg shadow-2xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className={cn('w-4 h-4', colors.text)} />
              <span className="text-sm font-bold text-white">接続品質</span>
            </div>
            {status === 'OPEN' ? (
              <Wifi className={cn('w-4 h-4', colors.text)} />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
          </div>

          {/* Status */}
          <div className="mb-3 pb-3 border-b border-[#233648]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#92adc9]">ステータス</span>
              <span className={cn('font-bold', colors.text)}>{statusLabel}</span>
            </div>
          </div>

          {/* Metrics - Only show when connected */}
          {metrics && status === 'OPEN' && (
            <>
              {/* Latency */}
              <div className="space-y-2 mb-3 pb-3 border-b border-[#233648]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">レイテンシ（平均）</span>
                  <span className="font-bold text-white">{formatLatency(metrics.avgLatency)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">レイテンシ（現在）</span>
                  <span className="font-bold text-white">{formatLatency(metrics.latency)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">範囲</span>
                  <span className="font-bold text-white">
                    {formatLatency(metrics.minLatency)} - {formatLatency(metrics.maxLatency)}
                  </span>
                </div>
              </div>

              {/* Packet Loss */}
              <div className="space-y-2 mb-3 pb-3 border-b border-[#233648]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">パケットロス</span>
                  <span className={cn(
                    'font-bold',
                    metrics.packetLossRate > 5 ? 'text-red-400' : 
                    metrics.packetLossRate > 2 ? 'text-yellow-400' : 
                    'text-green-400'
                  )}>
                    {metrics.packetLossRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">送信/受信</span>
                  <span className="font-bold text-white">
                    {metrics.packetsSent} / {metrics.packetsReceived}
                  </span>
                </div>
              </div>

              {/* Throughput */}
              <div className="space-y-2 mb-3 pb-3 border-b border-[#233648]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">スループット</span>
                  <span className="font-bold text-white">
                    {metrics.messagesPerSecond.toFixed(1)} msg/s
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">データレート</span>
                  <span className="font-bold text-white">
                    {(metrics.bytesPerSecond / 1024).toFixed(1)} KB/s
                  </span>
                </div>
              </div>

              {/* Connection Info */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">接続時間</span>
                  <span className="font-bold text-white">{formatUptime(metrics.uptime)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#92adc9]">再接続回数</span>
                  <span className="font-bold text-white">{metrics.reconnectCount}</span>
                </div>
              </div>
            </>
          )}

          {/* Fallback Mode Warning */}
          {status === 'FALLBACK' && (
            <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-bold">フォールバックモード</span>
              </div>
              <p className="mt-1 text-[10px] text-[#92adc9]">
                WebSocket接続が確立できないため、HTTPポーリングで動作しています。
              </p>
            </div>
          )}

          {/* Reconnecting Status */}
          {status === 'RECONNECTING' && (
            <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
              <div className="flex items-center gap-2 text-blue-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="font-bold">再接続中...</span>
              </div>
              <p className="mt-1 text-[10px] text-[#92adc9]">
                サーバーへの接続を試みています。
              </p>
            </div>
          )}

          {/* Actions */}
          {onReconnect && (status === 'ERROR' || status === 'CLOSED' || status === 'FALLBACK') && (
            <button
              onClick={onReconnect}
              className="w-full px-3 py-2 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              再接続
            </button>
          )}

          {/* Quality Legend */}
          {metrics && status === 'OPEN' && (
            <div className="mt-3 pt-3 border-t border-[#233648]">
              <div className="flex items-center gap-2 text-[10px] text-[#92adc9]">
                <TrendingUp className="w-3 h-3" />
                <span>品質スコア: {quality}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
