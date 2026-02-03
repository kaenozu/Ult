'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { Header } from '@/app/components/Header';
import { Navigation } from '@/app/components/Navigation';
import { ChartToolbar } from '@/app/components/ChartToolbar';
import { LeftSidebar } from '@/app/components/LeftSidebar';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useStockData } from '@/app/hooks/useStockData';
import { useSymbolAccuracy } from '@/app/hooks/useSymbolAccuracy';
import { Button } from '@/app/components/ui/Button';
import { Search } from 'lucide-react';
import { useTranslations } from '@/app/i18n/provider';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ChartLoading } from '@/app/components/StockChart/ChartLoading';

// Lazy load heavy components with chart.js dependencies
const StockChart = lazy(() => import('@/app/components/StockChart').then(m => ({ default: m.StockChart })));
const SimpleRSIChart = lazy(() => import('@/app/components/SimpleRSIChart').then(m => ({ default: m.SimpleRSIChart })));
const RightSidebar = lazy(() => import('@/app/components/RightSidebar').then(m => ({ default: m.RightSidebar })));
const BottomPanel = lazy(() => import('@/app/components/BottomPanel').then(m => ({ default: m.BottomPanel })));
const UserExperienceEnhancements = lazy(() => import('@/app/components/UserExperienceEnhancements').then(m => ({ default: m.UserExperienceEnhancements })));

function Workstation() {
  const t = useTranslations();
  const { portfolio, closePosition } = usePortfolioStore();
  const { journal } = useJournalStore();
  const { watchlist } = useWatchlistStore();
  const {
    selectedStock,
    chartData,
    indexData,
    chartSignal,
    loading,
    error,
    handleStockSelect,
    interval,
    setInterval,
    fallbackApplied,
    dataDelayMinutes
  } = useStockData();

  const [showSMA, setShowSMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Fetch accuracy data for the selected stock
  const { accuracy, loading: accuracyLoading } = useSymbolAccuracy(
    selectedStock || { symbol: '', name: '', market: 'usa', sector: '', price: 0, change: 0, changePercent: 0, volume: 0 },
    chartData
  );

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
            <p className="text-[#92adc9] mb-2">{t('page.dataFetchError')}</p>
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
          aria-label={t('header.toggleSidebar')}
          aria-expanded={isSidebarOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1">
          <Header />
        </div>
        <button
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className="lg:hidden p-4 text-[#92adc9] hover:text-white transition-colors border-l border-[#233648]"
          aria-label={t('header.toggleOrderPanel')}
          aria-expanded={isRightSidebarOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
              {t('page.dataFetchError')}: {error}
            </div>
          )}
          {!displayStock ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#92adc9] p-8 text-center animate-fade-in">
              <div className="w-24 h-24 mb-6 bg-[#192633] rounded-full flex items-center justify-center text-primary/40 animate-pulse-slow relative">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"></div>
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('page.noStockSelected')}</h2>
              <p className="text-sm max-w-xs opacity-80 leading-relaxed">
                {t('page.noStockSelectedDescription')}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-[#92adc9]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>銘柄名またはティッカーで検索</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#92adc9]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>リアルタイムデータとAI予測</span>
                </div>
              </div>
              <Button
                onClick={() => document.getElementById('stockSearch')?.focus()}
                className="mt-8 gap-2"
                variant="default"
                size="lg"
              >
                <Search className="w-4 h-4" />
                {t('page.searchStock')}
                <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
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
                interval={interval}
                setInterval={setInterval}
                fallbackApplied={fallbackApplied}
                dataDelayMinutes={dataDelayMinutes}
              />

              {/* Main Chart Visualization */}
              <div className="flex-1 relative p-3 flex flex-col">
                <div className="flex-1 relative w-full border border-[#233648] rounded bg-[#131b23] overflow-hidden">
                  <Suspense fallback={<ChartLoading height={400} />}>
                    <StockChart
                      data={chartData}
                      indexData={indexData}
                      loading={loading}
                      error={error}
                      market={selectedStock?.market}
                      signal={chartSignal}
                      accuracyData={accuracy ? {
                        hitRate: accuracy.hitRate,
                        totalTrades: accuracy.totalTrades,
                        predictionError: accuracy.predictionError,
                        loading: accuracyLoading
                      } : null}
                    />
                  </Suspense>
                </div>

                {/* RSI Sub-chart */}
                <div className="h-40 mt-1 border border-[#233648] rounded bg-[#131b23] relative">
                  <Suspense fallback={<ChartLoading height={160} showVolume={false} />}>
                    <SimpleRSIChart data={chartData} />
                  </Suspense>
                </div>
              </div>
            </>
          )}

          {/* Bottom Panel: Positions & Orders */}
          <Suspense fallback={<div className="h-48 bg-[#131b23] border-t border-[#233648]" />}>
            <BottomPanel
              portfolio={portfolio}
              journal={journal}
              onClosePosition={handleClosePosition}
            />
          </Suspense>
        </section>

        {/* Right Sidebar: Level 2 & Signal Panel */}
        <Suspense fallback={<div className="w-80 bg-[#131b23] border-l border-[#233648]" />}>
          <RightSidebar
            isOpen={isRightSidebarOpen}
            onClose={() => setIsRightSidebarOpen(false)}
            displayStock={displayStock}
            chartSignal={chartSignal}
            ohlcv={chartData}
            loading={loading}
          />
        </Suspense>
      </main>

      <Navigation />

      {/* User Experience Enhancements */}
      <Suspense fallback={null}>
        <UserExperienceEnhancements />
      </Suspense>

      {/* Disclaimer */}
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        {t('page.disclaimer')}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary name="HomePage">
      <Workstation />
    </ErrorBoundary>
  );
}
