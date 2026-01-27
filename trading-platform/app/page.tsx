'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/app/components/Header';
import { Navigation } from '@/app/components/Navigation';
import { StockChart } from '@/app/components/StockChart';
import { ChartToolbar } from '@/app/components/ChartToolbar';
import { LeftSidebar } from '@/app/components/LeftSidebar';
import { RightSidebar } from '@/app/components/RightSidebar';
import { BottomPanel } from '@/app/components/BottomPanel';
import { useTradingStore } from '@/app/store/tradingStore';
import { useStockData } from '@/app/hooks/useStockData';

export default function Workstation() {
  const portfolio = useTradingStore(state => state.portfolio);
  const closePosition = useTradingStore(state => state.closePosition);
  const watchlist = useTradingStore(state => state.watchlist);
  const journal = useTradingStore(state => state.journal);
  const {
    selectedStock,
    chartData,
    indexData,
    chartSignal,
    loading,
    error,
    handleStockSelect
  } = useStockData();

  const [showSMA, setShowSMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
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

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#92adc9] mb-2">データの取得に失敗しました</p>
            <p className="text-red-400">{error}</p>
          </div>
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
        <LeftSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          watchlist={watchlist}
          onSelect={handleStockSelect}
          selectedSymbol={displayStock?.symbol}
        />

        {/* Center: Chart Area */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#101922] relative">
          {error && (
            <div className="bg-red-500/10 border-b border-red-500/20 p-2 text-red-500 text-xs text-center font-medium animate-pulse">
              データの取得に失敗しました: {error}
            </div>
          )}
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
              indexData={indexData}
              loading={loading}
              error={error}
              market={selectedStock?.market}
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
          <BottomPanel
            portfolio={portfolio}
            journal={journal}
            onClosePosition={handleClosePosition}
          />
        </section>

        {/* Right Sidebar: Level 2 & Signal Panel */}
        <RightSidebar
          isOpen={isRightSidebarOpen}
          onClose={() => setIsRightSidebarOpen(false)}
          displayStock={displayStock}
          chartSignal={chartSignal}
          ohlcv={chartData}
          loading={loading}
        />
      </main>

      <Navigation />

      {/* Disclaimer */}
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}
