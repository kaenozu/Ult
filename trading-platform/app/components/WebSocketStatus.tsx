/**
 * WebSocket Connection Status Indicator
 * 
 * Visual indicator showing the current WebSocket connection status
 * with appropriate colors and icons.
 */

'use client';

import { useResilientWebSocket, WebSocketStatus } from '@/app/hooks/useResilientWebSocket';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  showDuration?: boolean;
}

const statusConfig: Record<WebSocketStatus, { color: string; label: string; icon: string }> = {
  'CONNECTING': { color: 'text-yellow-500', label: '接続中...', icon: '🟡' },
  'OPEN': { color: 'text-green-500', label: '接続済み', icon: '🟢' },
  'CLOSING': { color: 'text-yellow-500', label: '切断中...', icon: '🟡' },
  'CLOSED': { color: 'text-red-500', label: '切断', icon: '🔴' },
  'RECONNECTING': { color: 'text-yellow-500', label: '再接続中...', icon: '🟡' },
  'FALLBACK': { color: 'text-blue-500', label: 'フォールバック', icon: '🔵' },
  'ERROR': { color: 'text-red-500', label: 'エラー', icon: '🔴' },
};

export function WebSocketConnectionStatus({
  className = '',
  showLabel = true,
  showDuration = false,
}: ConnectionStatusProps) {
  const { status, isConnected, connectionDuration, reconnect, error } = useResilientWebSocket({
    enabled: true,
  });

  const config = statusConfig[status];
  const durationSeconds = Math.floor(connectionDuration / 1000);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationDisplay = durationMinutes > 0
    ? `${durationMinutes}分${durationSeconds % 60}秒`
    : `${durationSeconds}秒`;

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      data-testid="websocket-status"
      role="status"
      aria-live="polite"
      aria-label={`WebSocket接続状態: ${config.label}`}
    >
      <span className={`text-lg ${config.color}`} aria-hidden="true">
        {config.icon}
      </span>
      
      {showLabel && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
      
      {showDuration && isConnected && connectionDuration > 0 && (
        <span className="text-xs text-gray-500">
          ({durationDisplay})
        </span>
      )}
      
      {error && status === 'ERROR' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-500" title={error.message}>
            {error.category}
          </span>
          <button
            onClick={reconnect}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            aria-label="WebSocket再接続"
          >
            再接続
          </button>
        </div>
      )}
      
      {status === 'FALLBACK' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-600">
            HTTPポーリング中
          </span>
          <button
            onClick={reconnect}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            aria-label="WebSocket再接続を試行"
          >
            再接続
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for toolbar/header
 */
export function WebSocketStatusBadge({ className = '' }: { className?: string }) {
  return (
    <WebSocketConnectionStatus
      className={className}
      showLabel={false}
      showDuration={false}
    />
  );
}

/**
 * Detailed version with full info
 */
export function WebSocketStatusDetailed({ className = '' }: { className?: string }) {
  return (
    <WebSocketConnectionStatus
      className={className}
      showLabel={true}
      showDuration={true}
    />
  );
}
