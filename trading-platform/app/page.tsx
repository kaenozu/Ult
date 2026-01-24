'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/app/components/Header';
import { Navigation } from '@/app/components/Navigation';
import { StockTable } from '@/app/components/StockTable';
import { PositionTable } from '@/app/components/PositionTable';
import { HistoryTable } from '@/app/components/HistoryTable';
import { SignalPanel } from '@/app/components/SignalPanel';
import { StockChart } from '@/app/components/StockChart';
import { OrderPanel } from '@/app/components/OrderPanel';
import { OrderBook } from '@/app/components/OrderBook';
import { ChartToolbar } from '@/app/components/ChartToolbar';
import { useTradingStore } from '@/app/store/tradingStore';
import { cn } from '@/app/lib/utils';
import { useStockData } from '@/app/hooks/useStockData';

export default function Workstation() {
  const { portfolio, closePosition, watchlist, journal } = useTradingStore();
  const {
    selectedStock,
    chartData,
    chartSignal,
    loading,
    error,
    handleStockSelect
  } = useStockData();

  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [showSMA, setShowSMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'signal' | 'order'>('signal');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const handleClosePosition = useCallback((symbol: string, currentPrice: number) => {
    closePosition(symbol, currentPrice);
  }, [closePosition]);

  const displayStock = selectedStock; 

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      <div className="flex items-center border-b border-[#233648] bg-[#101922] pr-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-4 text-[#92adc9] hover:text-white transition-colors border-r border-[#233648]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1">
          <Header />
        </div>
        <button
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className="lg:hidden p-4 text-[#92adc9] hover:text-white transition-colors border-l border-[#233648]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop (Left) */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Mobile Backdrop (Right) */}
        {isRightSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Watchlist */}
        <aside className={cn(
          "w-80 min-w-[300px] flex flex-col border-r border-[#233648] bg-[#141e27] shrink-0 transition-transform duration-300 ease-in-out z-40",
          "lg:static lg:translate-x-0",
          isSidebarOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0"
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#233648] bg-[#192633]/50">
            <span className="text-xs font-bold text-[#92adc9] uppercase tracking-wider whitespace-nowrap">ウォッチリスト</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 text-[#92adc9] hover:text-white mr-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button className="p-1 hover:bg-[#233648] rounded text-[#92adc9] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button className="p-1 hover:bg-[#233648] rounded text-[#92adc9] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>
          </div>
          <StockTable
            stocks={watchlist}
            onSelect={handleStockSelect}
            selectedSymbol={displayStock?.symbol}
          />
        </aside>

        {/* Center: Chart Area */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#101922] relative">
          {!displayStock ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#92adc9] p-8 text-center">
              <div className="w-20 h-20 mb-6 bg-[#192633] rounded-full flex items-center justify-center text-primary/40">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">銘柄が未選択です</h2>
              <p className="text-sm max-w-xs">
                ウォッチリストから銘柄を選択するか、上の検索ボックスから銘柄を探して取引を開始してください。
              </p>
            </div>
          ) : (
            <>
              {/* Chart Header/Toolbar */}
              <ChartToolbar
                stock={displayStock}
                latestData={chartData.length > 0 ? chartData[chartData.length - 1] : undefined}
                showSMA={showSMA}
                setShowSMA={setShowSMA}
                showBollinger={showBollinger}
                setShowBollinger={setShowBollinger}
              />

              {/* Main Chart Visualization */}
              <div className="flex-1 relative p-4 flex flex-col">
                <div className="flex-1 relative w-full border border-[#233648] rounded bg-[#131b23] overflow-hidden">
                  <StockChart 
                    data={chartData} 
                    height={400} 
                    showVolume={true} 
                    showSMA={showSMA}
                    showBollinger={showBollinger}
                    market={displayStock?.market}
                    loading={loading}
                    error={error}
                    signal={chartSignal}
                  />
                </div>

                {/* RSI Sub-chart */}
                <div className="h-24 mt-1 border border-[#233648] rounded bg-[#131b23] relative">
                  <span className="absolute top-1 left-2 text-[10px] text-[#92adc9] font-medium">RSI (14)</span>
                  <div className="absolute top-0 left-0 right-0 bottom-0 grid grid-rows-2 grid-cols-1 pointer-events-none">
                    <div className="border-b border-[#233648]/20 border-dashed"></div>
                  </div>
                  <svg className="w-full h-full" preserveAspectRatio="none">
                    <path
                      d="M0,50 C50,40 100,60 150,30 S300,80 400,50 S500,20 600,40 S800,60 1200,45"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>
            </>
          )}

          {/* Bottom Panel: Positions & Orders */}
          <div className="h-52 border-t border-[#233648] bg-[#141e27] flex flex-col shrink-0">
            <div className="flex items-center gap-1 px-2 border-b border-[#233648] bg-[#192633]/50">
              {[
                { id: 'positions', label: `保有ポジション (${portfolio.positions.length})` },
                { id: 'orders', label: `注文一覧 (${portfolio.orders?.length || 0})` },
                { id: 'history', label: `取引履歴 (${journal.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'positions' | 'orders' | 'history')}
                  className={cn(
                    'px-4 py-2 text-xs font-medium transition-colors',
                    activeTab === tab.id
                      ? 'text-white border-b-2 border-primary bg-[#192633]/50'
                      : 'text-[#92adc9] hover:text-white hover:bg-[#192633]/50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'positions' && (
              <PositionTable positions={portfolio.positions} onClose={handleClosePosition} />
            )}
            {activeTab === 'orders' && (
              <div className="flex-1 flex items-center justify-center text-[#92adc9] text-sm italic">
                有効な注文はありません
              </div>
            )}
            {activeTab === 'history' && (
              <HistoryTable entries={journal} />
            )}
          </div>
        </section>

        {/* Right Sidebar: Level 2 & Signal Panel */}
        <aside className={cn(
          "w-80 flex flex-col border-l border-[#233648] bg-[#141e27] shrink-0 transition-transform duration-300 ease-in-out z-40",
          "lg:static lg:translate-x-0",
          isRightSidebarOpen ? "fixed inset-y-0 right-0 translate-x-0" : "fixed inset-y-0 right-0 translate-x-full lg:translate-x-0"
        )}>
          <div className="flex border-b border-[#233648] bg-[#192633]">
            <button
              onClick={() => setRightPanelMode('signal')}
              className={cn(
                'flex-1 py-2 text-xs font-bold transition-colors',
                rightPanelMode === 'signal' ? 'text-white border-b-2 border-primary' : 'text-[#92adc9] hover:text-white'
              )}
            >
              分析 & シグナル
            </button>
            <button
              onClick={() => setRightPanelMode('order')}
              className={cn(
                'flex-1 py-2 text-xs font-bold transition-colors',
                rightPanelMode === 'order' ? 'text-white border-b-2 border-primary' : 'text-[#92adc9] hover:text-white'
              )}
            >
              注文パネル
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayStock && (
              rightPanelMode === 'signal' ? (
                <SignalPanel 
                  stock={displayStock} 
                  signal={chartSignal} 
                  ohlcv={chartData}
                  loading={loading} 
                />
              ) : (
                <OrderPanel 
                  stock={displayStock} 
                  currentPrice={displayStock.price} 
                />
              )
            )}
          </div>

          {/* Level 2 / Order Book */}
          <OrderBook stock={displayStock} />
        </aside>
      </main>

      <Navigation />

      {/* Disclaimer */}
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}
