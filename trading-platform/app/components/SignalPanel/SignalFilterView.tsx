'use client';

import { Signal, OHLCV } from '@/app/types';
import { cn } from '@/app/lib/utils';

interface SignalFilterViewProps {
  signal: Signal;
  ohlcv?: OHLCV[];
}

export function SignalFilterView({ signal, ohlcv = [] }: SignalFilterViewProps) {
  const filterReasons = signal.filterReasons || [];

  if (filterReasons.length === 0) {
    return (
      <div className="bg-[#1a2632] p-3 rounded-lg border border-[#233648]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xs font-bold text-green-400">全フィルタ通過</span>
        </div>
        <p className="text-[10px] text-[#92adc9]/70 mt-1">
          このシグナルはすべてのフィルタ条件を満たしています
        </p>
      </div>
    );
  }

  // フィルタ理由を解析して、各フィルタの状態を判定
  const filterStatus = {
    volume: { passed: false, reason: '', score: 0 },
    trend: { passed: false, reason: '', score: 0 },
    adx: { passed: false, reason: '', score: 0 },
    stochastic: { passed: false, reason: '', score: 0 },
    williamsR: { passed: false, reason: '', score: 0 },
  };

  filterReasons.forEach(reason => {
    if (reason.includes('ボリューム')) {
      filterStatus.volume.passed = reason.includes('確認');
      filterStatus.volume.reason = reason;
      filterStatus.volume.score = filterStatus.volume.passed ? 5 : 0;
    } else if (reason.includes('トレンド')) {
      filterStatus.trend.passed = reason.includes('確認');
      filterStatus.trend.reason = reason;
      filterStatus.trend.score = filterStatus.trend.passed ? 5 : 0;
    } else if (reason.includes('ADX')) {
      filterStatus.adx.passed = reason.includes('確認');
      filterStatus.adx.reason = reason;
      filterStatus.adx.score = filterStatus.adx.passed ? 10 : 0;
    } else if (reason.includes('Stochastic')) {
      filterStatus.stochastic.passed = reason.includes('確認');
      filterStatus.stochastic.reason = reason;
      filterStatus.stochastic.score = filterStatus.stochastic.passed ? 5 : 0;
    } else if (reason.includes('Williams')) {
      filterStatus.williamsR.passed = reason.includes('確認');
      filterStatus.williamsR.reason = reason;
      filterStatus.williamsR.score = filterStatus.williamsR.passed ? 5 : 0;
    }
  });

  const totalScore = Object.values(filterStatus).reduce((sum, f) => sum + f.score, 0);

  return (
    <div className="bg-[#1a2632] p-3 rounded-lg border border-[#233648]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center",
            totalScore >= 25 ? "bg-green-500/20" : "bg-yellow-500/20"
          )}>
            {totalScore >= 25 ? (
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <span className={cn(
            "text-xs font-bold",
            totalScore >= 25 ? "text-green-400" : "text-yellow-400"
          )}>
            フィルタスコア: {totalScore}/30
          </span>
        </div>
        <span className="text-[10px] text-[#92adc9]/60">
          {totalScore >= 25 ? '高品質シグナル' : '注意が必要'}
        </span>
      </div>

      <div className="space-y-2 mt-3">
        {/* ボリュームフィルタ */}
        <div className="flex items-start gap-2">
          <div className={cn(
            "w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5",
            filterStatus.volume.passed ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {filterStatus.volume.passed ? (
              <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#92adc9]">ボリューム</span>
              <span className={cn(
                "text-[10px] font-bold",
                filterStatus.volume.passed ? "text-green-400" : "text-red-400"
              )}>
                +{filterStatus.volume.score}
              </span>
            </div>
            <p className="text-[9px] text-[#92adc9]/60 mt-0.5">{filterStatus.volume.reason}</p>
          </div>
        </div>

        {/* トレンドフィルタ */}
        <div className="flex items-start gap-2">
          <div className={cn(
            "w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5",
            filterStatus.trend.passed ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {filterStatus.trend.passed ? (
              <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#92adc9]">トレンド (SMA)</span>
              <span className={cn(
                "text-[10px] font-bold",
                filterStatus.trend.passed ? "text-green-400" : "text-red-400"
              )}>
                +{filterStatus.trend.score}
              </span>
            </div>
            <p className="text-[9px] text-[#92adc9]/60 mt-0.5">{filterStatus.trend.reason}</p>
          </div>
        </div>

        {/* ADXフィルタ */}
        <div className="flex items-start gap-2">
          <div className={cn(
            "w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5",
            filterStatus.adx.passed ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {filterStatus.adx.passed ? (
              <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#92adc9]">ADX (トレンド強度)</span>
              <span className={cn(
                "text-[10px] font-bold",
                filterStatus.adx.passed ? "text-green-400" : "text-red-400"
              )}>
                +{filterStatus.adx.score}
              </span>
            </div>
            <p className="text-[9px] text-[#92adc9]/60 mt-0.5">{filterStatus.adx.reason}</p>
          </div>
        </div>

        {/* Stochasticフィルタ */}
        <div className="flex items-start gap-2">
          <div className={cn(
            "w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5",
            filterStatus.stochastic.passed ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {filterStatus.stochastic.passed ? (
              <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#92adc9]">Stochastic</span>
              <span className={cn(
                "text-[10px] font-bold",
                filterStatus.stochastic.passed ? "text-green-400" : "text-red-400"
              )}>
                +{filterStatus.stochastic.score}
              </span>
            </div>
            <p className="text-[9px] text-[#92adc9]/60 mt-0.5">{filterStatus.stochastic.reason}</p>
          </div>
        </div>

        {/* Williams %Rフィルタ */}
        <div className="flex items-start gap-2">
          <div className={cn(
            "w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5",
            filterStatus.williamsR.passed ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {filterStatus.williamsR.passed ? (
              <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#92adc9]">Williams %R</span>
              <span className={cn(
                "text-[10px] font-bold",
                filterStatus.williamsR.passed ? "text-green-400" : "text-red-400"
              )}>
                +{filterStatus.williamsR.score}
              </span>
            </div>
            <p className="text-[9px] text-[#92adc9]/60 mt-0.5">{filterStatus.williamsR.reason}</p>
          </div>
        </div>
      </div>

      {/* フィルタサマリー */}
      <div className="mt-3 pt-2 border-t border-[#233648]/50">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#92adc9]">通過フィルタ</span>
          <span className="font-bold text-white">
            {Object.values(filterStatus).filter(f => f.passed).length}/5
          </span>
        </div>
      </div>
    </div>
  );
}
