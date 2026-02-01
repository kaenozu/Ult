'use client';

import { useState } from 'react';
import { Navigation } from '@/app/components/Navigation';
import { useJournalStore } from '@/app/store/journalStore';
import { cn, formatCurrency, formatPercent } from '@/app/lib/utils';

export default function Journal() {
  const { journal } = useJournalStore();
  const [activeTab, setActiveTab] = useState<'trades' | 'analysis'>('trades');

  const closedTrades = journal.filter(entry => entry.status === 'CLOSED');

  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0).length;
  const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const avgWin = winningTrades > 0
    ? closedTrades.filter(t => (t.profit || 0) > 0).reduce((sum, t) => sum + (t.profit as number), 0) / winningTrades
    : 0;
  const avgLoss = losingTrades > 0
    ? closedTrades.filter(t => (t.profit || 0) < 0).reduce((sum, t) => sum + (t.profit as number), 0) / losingTrades
    : 0;

  const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : avgWin > 0 ? Infinity : 0;

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">トレードジャーナル</h2>
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
                <span className="text-sm font-medium">Overview</span>
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">History</span>
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span className="text-sm font-medium">Analytics</span>
              </button>
            </nav>

            <div className="h-px w-full bg-[#233648]" />

            {/* Stats */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">Performance</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#92adc9]">Win Rate</span>
                  <span className="text-sm font-medium text-white">{winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#92adc9]">Profit Factor</span>
                  <span className="text-sm font-medium text-white">{profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#92adc9]">Total Trades</span>
                  <span className="text-sm font-medium text-white">{totalTrades}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">P&L</span>
              <div className="bg-[#192633] rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#92adc9]">Net Profit</span>
                  <span className={cn('font-bold', totalProfit >= 0 ? 'text-green-500' : 'text-red-500')}>
                    {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[#92adc9]">
                  <span>Avg Win</span>
                  <span className="text-green-500">{formatCurrency(avgWin)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#92adc9]">
                  <span>Avg Loss</span>
                  <span className="text-red-500">{formatCurrency(avgLoss)}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#233648]/50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('trades')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === 'trades'
                    ? 'text-white border-b-2 border-primary'
                    : 'text-[#92adc9] hover:text-white'
                )}
              >
                Trades ({closedTrades.length})
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === 'analysis'
                    ? 'text-white border-b-2 border-primary'
                    : 'text-[#92adc9] hover:text-white'
                )}
              >
                Analysis
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Entry
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'trades' ? (
              <div className="space-y-4">
                {closedTrades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#92adc9]">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No closed trades yet</p>
                    <p className="text-xs mt-2">Your completed trades will appear here</p>
                  </div>
                ) : (
                  closedTrades.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-[#141e27] border border-[#233648] rounded-lg p-4 hover:border-[#324d67] transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm',
                            (entry.profit || 0) >= 0
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          )}>
                            {entry.signalType}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{entry.symbol}</span>
                              <span className="text-xs text-[#92adc9]">{entry.date}</span>
                            </div>
                            <div className="text-xs text-[#92adc9]">
                              {entry.entryPrice} → {entry.exitPrice} × {entry.quantity} shares
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn('font-bold', (entry.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500')}>
                            {entry.profit ? (entry.profit >= 0 ? '+' : '') : ''}
                            {formatCurrency(entry.profit || 0)}
                          </div>
                          <div className="text-xs text-[#92adc9]">
                            {formatPercent(entry.profitPercent || 0)}
                          </div>
                        </div>
                      </div>
                      {entry.notes && (
                        <div className="mt-3 pt-3 border-t border-[#233648]">
                          <p className="text-xs text-[#92adc9]">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Performance Chart Placeholder */}
                <div className="col-span-full bg-[#141e27] border border-[#233648] rounded-lg p-6">
                  <h3 className="text-white font-medium mb-4">Performance Over Time</h3>
                  <div className="h-64 bg-[#192633] rounded flex items-center justify-center text-[#92adc9]">
                    Chart placeholder
                  </div>
                </div>

                {/* Win/Loss Distribution */}
                <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
                  <h3 className="text-white font-medium mb-4">Win/Loss Distribution</h3>
                  <div className="h-48 flex items-end gap-2">
                    {[30, 45, 25, 60, 40, 35, 50, 55, 30, 45, 25, 60].map((value, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/50 rounded-t"
                        style={{ height: `${value}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Monthly Returns */}
                <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
                  <h3 className="text-white font-medium mb-4">Monthly Returns</h3>
                  <div className="space-y-2">
                    {[
                      { month: 'Jan', return: 5.2 },
                      { month: 'Dec', return: -2.1 },
                      { month: 'Nov', return: 8.4 },
                      { month: 'Oct', return: -1.5 },
                      { month: 'Sep', return: 3.8 },
                      { month: 'Aug', return: -4.2 },
                    ].map((item) => (
                      <div key={item.month} className="flex items-center gap-3">
                        <span className="text-xs text-[#92adc9] w-8">{item.month}</span>
                        <div className="flex-1 h-2 bg-[#192633] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              item.return >= 0 ? 'bg-green-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(Math.abs(item.return) * 10, 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          'text-xs font-medium w-16 text-right',
                          item.return >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {item.return >= 0 ? '+' : ''}{item.return}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sector Performance */}
                <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
                  <h3 className="text-white font-medium mb-4">Sector Performance</h3>
                  <div className="space-y-3">
                    {[
                      { sector: 'Technology', return: 12.5 },
                      { sector: 'Automotive', return: 8.2 },
                      { sector: 'Finance', return: -3.1 },
                      { sector: 'Pharma', return: 5.4 },
                    ].map((item) => (
                      <div key={item.sector} className="flex items-center justify-between">
                        <span className="text-xs text-[#92adc9]">{item.sector}</span>
                        <span className={cn(
                          'text-xs font-medium',
                          item.return >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {item.return >= 0 ? '+' : ''}{item.return}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Navigation />

      {/* Disclaimer */}
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}
