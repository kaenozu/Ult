import type { BeginnerSignal } from '@/app/types/beginner-signal';
import { cn, formatCurrency } from '@/app/lib/utils';

interface BeginnerSignalCardProps {
  signal: BeginnerSignal;
  onExecute?: () => void;
  currentPrice?: number;
}

const ACTION_CONFIG = {
  BUY: {
    icon: '🟢',
    label: '買いシグナル',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-500',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    textColor: 'text-green-600 dark:text-green-400'
  },
  SELL: {
    icon: '🔴',
    label: '売りシグナル',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-500',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    textColor: 'text-red-600 dark:text-red-400'
  },
  WAIT: {
    icon: '⏸️',
    label: '様子見',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-400',
    buttonColor: 'bg-gray-500 hover:bg-gray-600',
    textColor: 'text-gray-600 dark:text-gray-400'
  }
};

const RISK_LABELS = {
  low: { text: '低リスク', color: 'text-green-500' },
  medium: { text: '中程度リスク', color: 'text-yellow-500' },
  high: { text: '高リスク', color: 'text-red-500' }
};

export function BeginnerSignalCard({ 
  signal, 
  onExecute,
  currentPrice 
}: BeginnerSignalCardProps) {
  const config = ACTION_CONFIG[signal.action];
  const riskInfo = RISK_LABELS[signal.riskLevel];

  return (
    <div className={cn(
      'rounded-lg border-2 p-5 transition-all duration-200 shadow-lg',
      config.borderColor,
      config.bgColor
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{config.icon}</span>
            <span className={cn('font-black text-2xl tracking-tight', config.textColor)}>
              {config.label}
            </span>
          </div>
          {signal.historicalWinRate !== undefined && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={cn(
                    "text-xs",
                    star <= Math.round((signal.historicalWinRate || 0) / 20) ? "text-yellow-500" : "text-gray-300"
                  )}>★</span>
                ))}
              </div>
              <span className="text-[10px] font-bold text-gray-500">過去の勝率: {signal.historicalWinRate}%</span>
              {signal.expectedValue !== undefined && (
                <span className="text-[10px] font-bold text-blue-500 ml-2 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                  収益期待値: +{signal.expectedValue.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-right bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-white/20">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">AIの自信度</div>
          <div className={cn('text-2xl font-black tabular-nums leading-none mt-1', config.textColor)}>
            {signal.confidence}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white/40 dark:bg-black/10 p-3 rounded-lg">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <span>💡</span> 理由をかんたんに解説
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
            {signal.reason}
          </p>
        </div>

        {signal.action !== 'WAIT' && signal.autoRisk && (
          <div className="space-y-3">
            {/* Position Sizing */}
            {signal.autoRisk.recommendedShares && (
              <div className="bg-blue-500/10 dark:bg-blue-900/20 rounded-xl p-4 border-2 border-blue-500/30 text-center">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">推奨される取引量</div>
                <div className="text-3xl font-black text-blue-700 dark:text-blue-300">
                  {signal.autoRisk.recommendedShares} <span className="text-sm font-bold">株</span>
                </div>
                <div className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-1">
                  あなたの資金とリスク設定に基づき算出されました
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="text-[10px] font-bold text-green-700 dark:text-green-300 mb-1">目標利益</div>
                <div className="text-lg font-black text-green-600 dark:text-green-400">
                  {signal.autoRisk.expectedProfitAmount ? `+${formatCurrency(signal.autoRisk.expectedProfitAmount, 'JPY')}` : `+${signal.autoRisk.takeProfitPercent.toFixed(1)}%`}
                </div>
                <div className="text-[10px] text-green-600/60">目安: {signal.autoRisk.takeProfitPrice.toFixed(1)}円</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <div className="text-[10px] font-bold text-red-700 dark:text-red-300 mb-1">最大損失(損切り)</div>
                <div className="text-lg font-black text-red-600 dark:text-red-400">
                  {signal.autoRisk.expectedLossAmount ? `-${formatCurrency(signal.autoRisk.expectedLossAmount, 'JPY')}` : `-${signal.autoRisk.stopLossPercent.toFixed(1)}%`}
                </div>
                <div className="text-[10px] text-red-600/60">目安: {signal.autoRisk.stopLossPrice.toFixed(1)}円</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">リスクレベル:</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 border', riskInfo.color)}>
              {riskInfo.text}
            </span>
          </div>
          {signal.indicatorCount !== undefined && (
            <div className="text-[10px] text-gray-400">
              分析指標の合致: <span className="font-bold text-gray-600 dark:text-gray-300">{signal.indicatorCount}個</span>
            </div>
          )}
        </div>

        {signal.action !== 'WAIT' && onExecute && (
          <button
            onClick={onExecute}
            className={cn(
              'w-full py-4 rounded-xl text-white font-black text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2',
              config.buttonColor
            )}
          >
            {signal.action === 'BUY' ? (
              <><span>💰</span> 買い注文を出す</>
            ) : (
              <><span>📉</span> 売り注文を出す</>
            )}
          </button>
        )}

        {signal.action === 'WAIT' && (
          <div className="text-center py-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
              現在は「待ち」のタイミングです
            </p>
            <p className="text-[10px] text-gray-400 mt-1 px-4">
              無理に取引せず、より確実なチャンスを待ちましょう。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
