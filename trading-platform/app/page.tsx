'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/app/components/Header';
import { Navigation } from '@/app/components/Navigation';
import { StockTable } from '@/app/components/StockTable';
import { PositionTable } from '@/app/components/StockTable';
import { SignalPanel } from '@/app/components/SignalPanel';
import { StockChart } from '@/app/components/StockChart';
import { useTradingStore } from '@/app/store/tradingStore';
import { fetchOHLCV, fetchSignal, ALL_STOCKS } from '@/app/data/stocks';
import { Stock, OHLCV, Signal } from '@/app/types';
import { cn, formatCurrency } from '@/app/lib/utils';

export default function Workstation() {
  const { portfolio, setSelectedStock, closePosition, watchlist } = useTradingStore();
  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [chartSignal, setChartSignal] = useState<Signal | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [selectedStock, setLocalSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSMA, setShowSMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      const defaultStock = watchlist[0];
      if (defaultStock) {
        setLocalSelectedStock(defaultStock);
        setSelectedStock(defaultStock);
        fetchData(defaultStock);
      }
    };

    initializeData();
  }, []);

  const fetchData = async (stock: Stock) => {
    setLoading(true);
    setError(null);
    setChartData([]); // Clear for skeleton
    setChartSignal(null);

    try {
      const data = await fetchOHLCV(stock.symbol, stock.market);
      if (data.length === 0) {
        setError('No data available');
      } else {
        setChartData(data);
        const signalData = await fetchSignal(stock);
        setChartSignal(signalData);
      }
    } catch (err) {
      console.error('Data fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = (stock: Stock) => {
    setLocalSelectedStock(stock);
    setSelectedStock(stock);
    fetchData(stock);
  };

  const handleClosePosition = (symbol: string, currentPrice: number) => {
    closePosition(symbol, currentPrice);
  };

  const displayStock = selectedStock || watchlist[0];
  const displaySignal = chartSignal;

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
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Watchlist */}
        <aside className="w-80 min-w-[300px] flex flex-col border-r border-[#233648] bg-[#141e27] shrink-0 max-lg:hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#233648] bg-[#192633]/50">
            <span className="text-xs font-bold text-[#92adc9] uppercase tracking-wider whitespace-nowrap">ウォッチリスト</span>
            <div className="flex gap-1">
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
          {/* Chart Header/Toolbar */}
          <div className="h-10 border-b border-[#233648] flex items-center justify-between px-4 bg-[#192633]/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{displayStock?.symbol}</span>
                <span className="text-xs text-[#92adc9]">{displayStock?.name}</span>
              </div>
              <div className="h-4 w-px bg-[#233648]" />
              <div className="flex bg-[#192633] rounded-md p-0.5 gap-0.5">
                {['1m', '5m', '15m', '1H', '4H', 'D'].map((tf) => (
                  <button
                    key={tf}
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded transition-colors',
                      tf === '5m'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-[#92adc9] hover:text-white hover:bg-[#233648]'
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-[#233648]" />
              <div className="flex bg-[#192633] rounded-md p-0.5 gap-0.5">
                <button
                  onClick={() => setShowSMA(!showSMA)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded transition-colors',
                    showSMA ? 'bg-yellow-500/20 text-yellow-500' : 'text-[#92adc9] hover:text-white'
                  )}
                >
                  SMA
                </button>
                <button
                  onClick={() => setShowBollinger(!showBollinger)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded transition-colors',
                    showBollinger ? 'bg-blue-500/20 text-blue-400' : 'text-[#92adc9] hover:text-white'
                  )}
                >
                  BB
                </button>
              </div>
              <div className="h-4 w-px bg-[#233648]" />
              <div className="flex items-center gap-3 text-xs text-[#92adc9]">
                <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  インジケーター
                </span>
                <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  ツール
                </span>
              </div>
            </div>
            {chartData.length > 0 && (
              <div className="flex items-center gap-4 text-sm tabular-nums">
                <span className="text-[#92adc9]">O: <span className="text-white">{formatCurrency(chartData[chartData.length - 1]?.open || 0, displayStock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
                <span className="text-[#92adc9]">H: <span className="text-white">{formatCurrency(chartData[chartData.length - 1]?.high || 0, displayStock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
                <span className="text-[#92adc9]">L: <span className="text-white">{formatCurrency(chartData[chartData.length - 1]?.low || 0, displayStock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
                <span className="text-[#92adc9]">C: <span className="text-white">{formatCurrency(chartData[chartData.length - 1]?.close || 0, displayStock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
              </div>
            )}
          </div>

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
                currentPrice={displayStock?.price}
                loading={loading}
                error={error}
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

          {/* Bottom Panel: Positions & Orders */}
          <div className="h-52 border-t border-[#233648] bg-[#141e27] flex flex-col shrink-0">
            <div className="flex items-center gap-1 px-2 border-b border-[#233648] bg-[#192633]/50">
              {[
                { id: 'positions', label: `保有ポジション (${portfolio.positions.length})` },
                { id: 'orders', label: '注文一覧 (2)' },
                { id: 'history', label: '取引履歴' },
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
              <div className="flex-1 flex items-center justify-center text-[#92adc9] text-sm">
                No active orders
              </div>
            )}
            {activeTab === 'history' && (
              <div className="flex-1 flex items-center justify-center text-[#92adc9] text-sm">
                No trading history yet
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar: Level 2 & Signal Panel */}
        <aside className="w-80 flex flex-col border-l border-[#233648] bg-[#141e27] shrink-0 max-lg:hidden">
          {displayStock && (
            <SignalPanel stock={displayStock} signal={chartSignal} loading={loading} />
          )}

          {/* Level 2 / Order Book */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#233648] bg-[#192633]/50 flex justify-between items-center">
              <span className="text-xs font-bold text-[#92adc9] uppercase tracking-wider">板情報</span>
              <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-bold border border-blue-500/30">
                {displayStock?.market === 'japan' ? '東証' : 'NYSE'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#101922]">
              <table className="w-full text-xs tabular-nums border-collapse">
                <thead className="sticky top-0 bg-[#141e27] text-[10px] text-[#92adc9] z-10">
                  <tr>
                    <th className="py-2 px-2 text-center font-medium w-1/3 border-b border-[#233648]">買数量</th>
                    <th className="py-2 px-2 text-center font-medium w-1/3 border-b border-[#233648]">気配値</th>
                    <th className="py-2 px-2 text-center font-medium w-1/3 border-b border-[#233648]">売数量</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const basePrice = displayStock?.price || 100;
                    const bids = [
                      { price: basePrice - 0.01, size: 920 },
                      { price: basePrice - 0.02, size: 410 },
                      { price: basePrice - 0.03, size: 250 },
                      { price: basePrice - 0.04, size: 180 },
                      { price: basePrice - 0.05, size: 120 },
                    ];
                    const asks = [
                      { price: basePrice + 0.01, size: 450 },
                      { price: basePrice + 0.02, size: 230 },
                      { price: basePrice + 0.03, size: 150 },
                      { price: basePrice + 0.04, size: 100 },
                      { price: basePrice + 0.05, size: 80 },
                    ];

                    return (
                      <>
                        {asks.reverse().map((ask, i) => (
                          <tr key={`ask-${i}`} className="hover:bg-[#192633]/50">
                            <td className="py-0.5 px-2 text-right text-[#92adc9]"></td>
                            <td className="py-0.5 px-2 text-center text-red-500 font-medium">
                              {formatCurrency(ask.price, displayStock?.market === 'japan' ? 'JPY' : 'USD')}
                            </td>
                            <td className="py-0.5 px-2 text-left text-white relative">
                              <span
                                className="absolute inset-y-0 left-0 bg-red-500/20"
                                style={{ width: `${Math.min(ask.size / 5, 100)}%` }}
                              ></span>
                              <span className="relative z-10">{ask.size}</span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-[#192633] border-y border-[#233648]">
                          <td className="py-1 px-4 text-center font-bold text-sm text-white flex justify-center items-center gap-2" colSpan={3}>
                            {displayStock ? formatCurrency(displayStock.price, displayStock.market === 'japan' ? 'JPY' : 'USD') : '-'}
                            <span className="text-[10px] font-normal text-[#92adc9]">
                              Spread: 0.02
                            </span>
                          </td>
                        </tr>
                        {bids.map((bid, i) => (
                          <tr key={`bid-${i}`} className="hover:bg-[#192633]/50">
                            <td className="py-0.5 px-2 text-right text-white relative">
                              <span
                                className="absolute inset-y-0 right-0 bg-green-500/20"
                                style={{ width: `${Math.min(bid.size / 10, 100)}%` }}
                              ></span>
                              <span className="relative z-10">{bid.size}</span>
                            </td>
                            <td className="py-0.5 px-2 text-center text-green-500 font-medium">
                              {formatCurrency(bid.price, displayStock?.market === 'japan' ? 'JPY' : 'USD')}
                            </td>
                            <td className="py-0.5 px-2 text-left text-[#92adc9]"></td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
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
