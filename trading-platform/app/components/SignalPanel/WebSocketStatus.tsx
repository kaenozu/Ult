'use client';

import { cn } from '@/app/lib/utils';

export interface WebSocketStatusProps {
  status: 'OPEN' | 'CONNECTING' | 'ERROR' | 'CLOSED';
  onReconnect?: () => void;
}

export const WebSocketStatus = function WebSocketStatus({ status, onReconnect }: WebSocketStatusProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        'w-2 h-2 rounded-full',
        status === 'OPEN' ? 'bg-green-500' :
          status === 'CONNECTING' ? 'bg-yellow-500' :
            status === 'ERROR' ? 'bg-red-500' :
              'bg-gray-500'
      )} />
      <span className="text-[10px] text-[#92adc9]">
        {status === 'OPEN' ? '接続済' :
          status === 'CONNECTING' ? '接続中...' :
            status === 'ERROR' ? 'エラー' :
              '未接続'}
      </span>
      {status === 'ERROR' || status === 'CLOSED' ? (
        <button
          onClick={onReconnect}
          className="text-[10px] text-blue-400 hover:text-blue-300 underline"
          title="WebSocketを再接続"
        >
          再接続
        </button>
      ) : null}
    </div>
  );
};
