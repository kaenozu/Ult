import { cn } from '@/app/lib/utils';

interface WebSocketManagerProps {
  wsStatus: string;
  reconnect: () => void;
}

export function WebSocketManager({ wsStatus, reconnect }: WebSocketManagerProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        'w-2 h-2 rounded-full',
        wsStatus === 'OPEN' ? 'bg-green-500' :
          wsStatus === 'CONNECTING' ? 'bg-yellow-500' :
            wsStatus === 'ERROR' ? 'bg-red-500' :
              'bg-gray-500'
      )} />
      <span className="text-[10px] text-[#92adc9]">
        {wsStatus === 'OPEN' ? '接続済' :
          wsStatus === 'CONNECTING' ? '接続中...' :
            wsStatus === 'ERROR' ? 'エラー' :
              '未接続'}
      </span>
      {wsStatus === 'ERROR' || wsStatus === 'CLOSED' ? (
        <button
          onClick={reconnect}
          className="text-[10px] text-blue-400 hover:text-blue-300 underline"
          title="WebSocketを再接続"
        >
          再接続
        </button>
      ) : null}
    </div>
  );
}