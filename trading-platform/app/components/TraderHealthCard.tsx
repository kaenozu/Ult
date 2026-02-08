'use client';

import { usePsychologyStore } from '@/app/store/psychologyStore';
import { cn } from '@/app/lib/utils';
import { AlertCircle, Brain, CheckCircle2, Zap } from 'lucide-react';

/**
 * トレーダー・ヘルスメトリクス・カード
 * トレーダーの心理状態と規律を可視化するコンポーネント。
 */
export function TraderHealthCard() {
  const {
    current_mental_health,
    active_recommendations
  } = usePsychologyStore();

  // 新しいAPIから値を取得（オプショナルチェーンを使用）
  const mentalState = current_mental_health?.state;
  const overallScore = current_mental_health?.overall_score ?? 0;
  const stressLevel = current_mental_health?.stress_level ?? 0;
  const disciplineScore = current_mental_health?.discipline_score ?? 0;
  const riskOfTilt = current_mental_health?.risk_of_tilt ?? 0;

  const getStatusConfig = () => {
    switch (mentalState) {
      case 'optimal':
        return { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: CheckCircle2, label: '最適' };
      case 'cautious':
        return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: AlertCircle, label: '注意' };
      case 'stressed':
        return { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', icon: Zap, label: 'ストレス' };
      case 'tilt':
        return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertCircle, label: '暴走リスク' };
      default:
        return { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: Brain, label: '安定' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all duration-300",
      config.bg,
      config.border
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <config.icon className={cn("w-5 h-5", config.color)} />
          <h3 className="font-bold text-white tracking-tight">トレーダー・ヘルス</h3>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
          config.bg,
          config.color,
          "border border-current/20"
        )}>
          {config.label}
        </div>
      </div>

      {/* Main Score */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs text-[#92adc9]">総合メンタルスコア</span>
          <span className={cn("text-2xl font-black", config.color)}>{overallScore}</span>
        </div>
        <div className="h-1.5 w-full bg-[#192633] rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-1000", config.color.replace('text-', 'bg-'))}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/20 p-2 rounded-lg border border-white/5">
          <span className="text-[10px] text-[#92adc9] block mb-1">ストレス</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[#192633] rounded-full">
              <div 
                className="h-full bg-orange-400 rounded-full" 
                style={{ width: `${stressLevel}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-white">{stressLevel}%</span>
          </div>
        </div>
        <div className="bg-black/20 p-2 rounded-lg border border-white/5">
          <span className="text-[10px] text-[#92adc9] block mb-1">規律</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[#192633] rounded-full">
              <div 
                className="h-full bg-blue-400 rounded-full" 
                style={{ width: `${disciplineScore}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-white">{disciplineScore}%</span>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-2">
        {active_recommendations.map((rec, i) => (
          <div key={i} className="flex gap-2 text-[11px] leading-relaxed text-[#92adc9]">
            <span className={cn("mt-1.5 w-1 h-1 rounded-full shrink-0", config.color.replace('text-', 'bg-'))} />
            <p>{rec.message}</p>
          </div>
        ))}
      </div>

      {/* Tilt Risk Alert */}
      {riskOfTilt > 0.5 && (
        <div className="mt-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg animate-pulse">
          <p className="text-[10px] font-bold text-red-400 text-center uppercase tracking-widest">
            ⚠️ Tilt (感情的暴走) リスクを検知
          </p>
        </div>
      )}
    </div>
  );
}
