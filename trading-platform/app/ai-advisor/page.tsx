/**
 * AI Trade Advisor Page
 * 
 * Provides pattern analysis and psychology monitoring
 * to help traders make better decisions.
 */

'use client';

import { useEffect } from 'react';
import { Navigation } from '@/app/components/Navigation';
import { PatternAnalysisPanel } from '@/app/components/PatternAnalysisPanel';
import { PsychologyWarningPanel } from '@/app/components/PsychologyWarningPanel';
import { useExtendedJournalStore } from '@/app/store/journalStoreExtended';
import { cn } from '@/app/lib/utils';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

function AIAdvisorContent() {
  const { psychologyState, activeWarnings } = useExtendedJournalStore();

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      {/* Mock Data Banner */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-center gap-2 text-yellow-400 text-xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-medium">注意:  表示データはモック（模擬データ）です。実際の市場データではありません。</span>
        <span className="text-yellow-500/60">Mock Data Only</span>
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
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">AIトレード・アドバイザー</h2>
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
          <div className="flex items-center gap-3 pl-2">
            <div className="hidden xl:flex flex-col">
              <span className="text-xs font-bold text-white leading-none mb-1">K. Tanaka</span>
              <span className="text-[10px] font-medium text-emerald-400 leading-none">● Market Open</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0 z-10 max-lg:hidden">
          <div className="p-5 flex flex-col gap-6">
            <div className="flex items-center gap-3 px-2">
              <div className="size-10 bg-center bg-no-repeat bg-cover rounded-full ring-2 ring-primary/20" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuARZJdTQ8NN5-AppYn7TeBtwap-bUwXfPfnQc6UBsMWsTcN5v5XvQY1sc7Bew71qlZ41pbTd0YEn_M5bAIv9cccq7xItHrkH6oPp-n_8tljknEzSRl-UpPxHzlaI6ypY2Y7-6qZSTRG4BdlwQwsRzOechzBjZO7vRqDDLCpK-Xj61O0LuX8V4pDOMwoqf5fnWvNgBPe9ArL2ClIanDSW4dR45IO55Fh9k-OYUJgUchHa7sFqfUlYTMl0Hl-ksinOxe0FI_gOX5I708")' }}></div>
              <div className="flex flex-col">
                <h1 className="text-white text-sm font-semibold leading-tight">Alex Trader</h1>
                <p className="text-[#92adc9] text-xs font-medium">Pro Account</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#192633] text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium">パターン分析</span>
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">心理状態</span>
              </button>
            </nav>

            <div className="h-px w-full bg-[#233648]" />

            {/* Psychology Stats */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">心理状態</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#92adc9]">現在のストリーク</span>
                  <span className={cn(
                    'text-sm font-medium',
                    psychologyState.currentStreak === 'winning' ? 'text-green-500' :
                    psychologyState.currentStreak === 'losing' ? 'text-red-500' :
                    'text-white'
                  )}>
                    {psychologyState.currentStreak === 'winning' ? `${psychologyState.consecutiveWins}連勝` :
                     psychologyState.currentStreak === 'losing' ? `${psychologyState.consecutiveLosses}連敗` :
                     'ニュートラル'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#92adc9]">リスク許容度</span>
                  <span className="text-sm font-medium text-white">
                    {(psychologyState.riskTolerance * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#92adc9]">本日の取引</span>
                  <span className="text-sm font-medium text-white">{psychologyState.tradesToday}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">警告</span>
              <div className="bg-[#192633] rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#92adc9]">アクティブ警告</span>
                  <span className={cn(
                    'font-bold',
                    activeWarnings.length > 0 ? 'text-yellow-500' : 'text-green-500'
                  )}>
                    {activeWarnings.length}
                  </span>
                </div>
                <div className="text-xs text-[#92adc9]">
                  {activeWarnings.length > 0
                    ? '警告があります。注意してください。'
                    : '警告はありません。'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922] overflow-auto">
          <div className="p-6">
            <PatternAnalysisPanel />
          </div>
        </main>
      </div>

      {/* Psychology Warning Panel */}
      <PsychologyWarningPanel />

      <Navigation />

      {/* Disclaimer */}
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}

export default function AIAdvisorPage() {
  return (
    <ErrorBoundary name="AIAdvisorPage">
      <AIAdvisorContent />
    </ErrorBoundary>
  );
}
