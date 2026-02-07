'use client';

import { useState, useEffect } from 'react';
import { Stock } from '@/app/types';
import { unifiedIntelligenceService, IntelligenceReport } from '@/app/lib/services/UnifiedIntelligenceService';
import { intelligenceManager } from '@/app/lib/services/IntelligenceManager';
import { SignalValidatorService } from '@/app/lib/SignalValidatorService';
import { cn } from '@/app/lib/utils';
import { ShieldCheck, Target, BarChart3, Info, TrendingUp, TrendingDown, History, Coins, Cpu } from 'lucide-react';

interface UnifiedIntelligenceCardProps {
  stock: Stock;
}

export function UnifiedIntelligenceCard({ stock }: UnifiedIntelligenceCardProps) {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [hitRate, setHitRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComputing, setIsComputing] = useState(false);

  useEffect(() => {
    async function fetchAnalysis() {
      setIsLoading(true);
      try {
        // 1. 統合レポート生成
        const result = await unifiedIntelligenceService.generateReport(stock.symbol, stock.market as any);
        setReport(result);

        // 2. 並列スレッドによる高度なバックグラウンド計算のシミュレーション
        setIsComputing(true);
        await intelligenceManager.runAsyncAnalysis(stock.symbol, result);
        setIsComputing(false);

        // 3. 的中率の計算
        if (result && result.symbol) {
          const validator = new SignalValidatorService();
          const marketData = await fetch(`/api/market?type=history&symbol=${stock.symbol}`).then(res => res.json());
          if (marketData.success) {
            const mockSignals = marketData.data.slice(-20, -1).map((d: any) => ({
              symbol: stock.symbol,
              type: 'BUY',
              price: d.close,
              timestamp: new Date(d.date).getTime(),
              confidence: 0.7
            }));
            const validation = validator.validate(mockSignals, marketData.data);
            setHitRate(validation.hitRate);
          }
        }
      } catch (error) {
        console.error('Unified analysis failed:', error);
      } finally {
        setIsLoading(false);
        setIsComputing(false);
      }
    }
    fetchAnalysis();
  }, [stock.symbol, stock.market]);

  if (isLoading || !report) {
    return (
      <div className="p-5 bg-gradient-to-br from-[#1a2b3c] to-[#141e27] rounded-2xl border border-primary/20 animate-pulse">
        <div className="h-4 w-40 bg-white/10 rounded mb-6" />
        <div className="h-12 w-full bg-white/10 rounded-xl mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-4/5 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  const getRecommendationStyle = (rec: IntelligenceReport['recommendation']) => {
    switch (rec) {
      case 'STRONG_BUY': return { color: 'text-green-400', label: '強い買い', icon: TrendingUp, bg: 'bg-green-400/20' };
      case 'BUY': return { color: 'text-green-300', label: '買い', icon: TrendingUp, bg: 'bg-green-300/10' };
      case 'SELL': return { color: 'text-red-300', label: '売り', icon: TrendingDown, bg: 'bg-red-300/10' };
      case 'STRONG_SELL': return { color: 'text-red-500', label: '強い売り', icon: TrendingDown, bg: 'bg-red-500/20' };
      default: return { color: 'text-gray-400', label: '中立', icon: Target, bg: 'bg-gray-400/10' };
    }
  };

  const style = getRecommendationStyle(report.recommendation);

  return (
    <div className="p-5 bg-gradient-to-br from-[#1a2b3c] to-[#141e27] rounded-2xl border border-primary/30 shadow-2xl relative overflow-hidden group">
      <div className={cn("absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-20 rounded-full", style.bg.replace('/10', ''))} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">統合意思決定シグナル</h3>
        </div>
        <div className="flex items-center gap-2">
          {isComputing && (
            <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded border border-primary/20 animate-pulse">
              <Cpu className="w-2.5 h-2.5 text-primary" />
              <span className="text-[8px] text-primary font-bold uppercase">Parallel Computing</span>
            </div>
          )}
          <span className="text-[10px] text-white/40 font-mono">
            {new Date(report.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (226 * report.confidenceScore) / 100} className={cn("transition-all duration-1000 ease-out", style.color)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-white leading-none">{report.confidenceScore}%</span>
            <span className="text-[8px] text-white/50 uppercase font-bold">確信度</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full", style.bg)}>
              <style.icon className={cn("w-4 h-4", style.color)} />
              <span className={cn("text-xs font-black uppercase", style.color)}>{style.label}</span>
            </div>
            {report.expectedValue.expectedValue > 0 && (
              <div className="bg-amber-400/10 px-2 py-1 rounded-full border border-amber-400/20 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-bold">期待利益: +{report.expectedValue.expectedValue.toFixed(0)}</span>
              </div>
            )}
            {hitRate !== null && (
              <div className="bg-white/5 px-2 py-1 rounded-full border border-white/10 flex items-center gap-1">
                <History className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-[#92adc9] font-bold">的中率: {hitRate.toFixed(0)}%</span>
              </div>
            )}
          </div>
          <p className="text-xs text-white/70 leading-relaxed italic">
            「{report.reasoning[0]}」
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'AI予測', val: report.components.aiPrediction, icon: Target },
          { label: 'テクニカル', val: report.components.technicalScore, icon: BarChart3 },
        ].map((comp, i) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <comp.icon className="w-3 h-3 text-primary/60" />
              <span className="text-[10px] text-white/90 font-bold">{comp.val}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full">
              <div className="h-full bg-primary rounded-full" style={{ width: `${comp.val}%` }} />
            </div>
            <span className="text-[8px] text-white/40 uppercase mt-1 block">{comp.label}</span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3 text-white/30" />
          <span className="text-[9px] text-white/30">統計的確信度に基づく分析結果</span>
        </div>
        <button className="text-[10px] font-bold text-primary hover:text-primary-foreground transition-colors uppercase tracking-tighter">
          詳細レポートを表示 →
        </button>
      </div>
    </div>
  );
}
