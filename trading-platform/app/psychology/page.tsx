'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/app/components/Navigation';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ScreenLabel } from '@/app/components/ScreenLabel';
import { MentalHealthDashboard } from '@/app/components/Psychology/MentalHealthDashboard';
import { AICoachPanel } from '@/app/components/Psychology/AICoachPanel';
import { usePsychologyStore } from '@/app/store/psychologyStore';
import { getPsychologyData } from '@/app/lib/mockPsychologyData';
import type { PsychologyAnalysisResult } from '@/app/types/psychology';

function PsychologyContent() {
  const {
    currentMentalHealth,
    current_emotions,
    active_recommendations,
    dismissRecommendation,
    addAnalysis,
  } = usePsychologyStore();

  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PsychologyAnalysisResult | null>(null);

  useEffect(() => {
    // Simulate loading psychology analysis
    const timer = setTimeout(() => {
      const mockAnalysis = getPsychologyData();
      setAnalysis(mockAnalysis);
      addAnalysis(mockAnalysis);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [addAnalysis]);

  const refreshAnalysis = () => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const mockAnalysis = getPsychologyData();
      setAnalysis(mockAnalysis);
      addAnalysis(mockAnalysis);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  };

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      <ScreenLabel label="トレーダー心理分析 / Trading Psychology" />
      {/* Mock Data Banner */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-center gap-2 text-yellow-400 text-xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-medium">注意: 表示データはデモ用のモックデータです</span>
        <span className="text-yellow-500/60">Mock Data Demo</span>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#233648] bg-[#101922] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">トレーディング心理学</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={refreshAnalysis}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? '分析中...' : '更新'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#92adc9]">心理状態を分析中...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header with warning if needed */}
            {analysis?.should_stop_trading && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-500 font-bold text-lg mb-2">⚠️ トレーディングを中止してください</h3>
                    <p className="text-red-400 text-sm mb-4">
                      現在の心理状態はトレーディングに適していません。休憩を取ることを強く推奨します。
                    </p>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                        トレーディングを停止
                      </button>
                      <button className="px-4 py-2 bg-[#192633] text-white rounded-lg text-sm font-medium hover:bg-[#233648] transition-colors">
                        詳細を見る
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mental Health Dashboard */}
              <div className="lg:col-span-1">
                <MentalHealthDashboard
                  metrics={currentMentalHealth}
                  emotions={current_emotions}
                />
              </div>

              {/* AICoachPanel */}
              <div className="lg:col-span-1">
                <AICoachPanel
                  recommendations={active_recommendations}
                  onDismiss={dismissRecommendation}
                />
              </div>
            </div>

            {/* Additional Information Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
                <h3 className="text-white font-medium mb-4">本日の統計</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#92adc9]">トレード数</span>
                    <span className="text-white font-medium">5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#92adc9]">勝率</span>
                    <span className="text-green-500 font-medium">60%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#92adc9]">規律違反</span>
                    <span className="text-yellow-500 font-medium">1</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#92adc9]">トレード時間</span>
                    <span className="text-white font-medium">2.5h</span>
                  </div>
                </div>
              </div>

              {/* Recent Patterns */}
              <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
                <h3 className="text-white font-medium mb-4">検出パターン</h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-[#192633] rounded">
                    <span className="text-green-500">✓</span> 朝のトレードで勝率が高い
                  </div>
                  <div className="p-2 bg-[#192633] rounded">
                    <span className="text-yellow-500">!</span> 昼休憩後に注意力低下
                  </div>
                  <div className="p-2 bg-[#192633] rounded">
                    <span className="text-green-500">✓</span> ストップロス遵守率が向上
                  </div>
                </div>
              </div>

              {/* Goals Progress */}
              <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
                <h3 className="text-white font-medium mb-4">目標達成度</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#92adc9]">規律スコア目標</span>
                      <span className="text-white">75/80</span>
                    </div>
                    <div className="h-2 bg-[#192633] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '93.75%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#92adc9]">ジャーナル記入率</span>
                      <span className="text-white">90%</span>
                    </div>
                    <div className="h-2 bg-[#192633] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#92adc9]">休憩遵守</span>
                      <span className="text-white">85%</span>
                    </div>
                    <div className="h-2 bg-[#192633] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Footer */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-400 font-medium mb-1">心理学分析について</p>
                  <p className="text-blue-300 text-xs">
                    この機能は、あなたのトレード履歴から心理的パターンを分析し、感情トレードを防ぐための推奨事項を提供します。
                    定期的にチェックして、健全なトレーディング習慣を維持しましょう。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Navigation />

      {/* Disclaimer */}
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}

export default function PsychologyPage() {
  return (
    <ErrorBoundary name="PsychologyPage">
      <PsychologyContent />
    </ErrorBoundary>
  );
}