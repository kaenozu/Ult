'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Settings, User, Wifi, WifiOff, Edit2, Plus, Loader2 } from 'lucide-react';
import { useTradingStore } from '@/app/store/tradingStore';
import { formatCurrency, cn } from '@/app/lib/utils';
import { ALL_STOCKS, fetchStockMetadata } from '@/app/data/stocks';
import { Stock } from '@/app/types';

export function Header() {
  const { portfolio, isConnected, toggleConnection, setCash, addToWatchlist, setSelectedStock, watchlist } = useTradingStore();
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const [searchQuery, setSearchInput] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const dailyPnL = portfolio.dailyPnL;
  const denominator = portfolio.totalValue - dailyPnL;
  const dailyPnLPercent = (portfolio.totalValue > 0 && denominator !== 0) ? (dailyPnL / denominator) * 100 : 0;

  useEffect(() => {
    if (isEditingCash && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingCash]);

  // Click outside search to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCashClick = () => {
    setCashInput(portfolio.cash.toString());
    setIsEditingCash(true);
  };

  const handleCashSubmit = () => {
    const newCash = parseFloat(cashInput);
    if (!isNaN(newCash) && newCash >= 0) {
      setCash(newCash);
    }
    setIsEditingCash(false);
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim().toUpperCase();
      if (!query) return;

      // 1. まずローカルの全リストから完全一致を探す
      const exactMatch = ALL_STOCKS.find(s => s.symbol.toUpperCase() === query);
      if (exactMatch) {
        handleStockSelect(exactMatch);
        return;
      }

      // 2. 検索結果が1件ならそれを選択
      if (searchResults.length === 1) {
        handleStockSelect(searchResults[0]);
        return;
      }

      // 3. なければAPIから未知の銘柄として取得を試みる
      if (query.length >= 2) {
        setIsSearchingAPI(true);
        try {
          const newStock = await fetchStockMetadata(query);
          if (newStock) {
            handleStockSelect(newStock);
          } else {
            // エラー表示の代わりにプレースホルダー
            console.warn('Symbol not found:', query);
          }
        } catch (err) {
          console.error('On-demand fetch error:', err);
        } finally {
          setIsSearchingAPI(false);
        }
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return ALL_STOCKS.filter(s => 
      s.symbol.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [searchQuery]);

  const handleStockSelect = (stock: Stock) => {
    addToWatchlist(stock);
    setSelectedStock(stock);
    setSearchInput('');
    setShowResults(false);
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[#233648] bg-[#101922] shrink-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4 3h2v11h-2V10zm4-6h2v17h-2V4zm4 4h2v13h-2V8z" />
          </svg>
          <h1 className="text-white text-lg font-bold tracking-tight">TRADER PRO</h1>
        </div>
        <div className="h-6 w-px bg-[#233648]" />
        <div className="flex gap-10 text-sm tabular-nums">
          <div className="flex flex-col leading-tight group cursor-pointer relative" onClick={handleCashClick}>
            <span className="text-[#92adc9] text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
              余力 <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            {isEditingCash ? (
              <input
                ref={inputRef}
                type="number"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                onBlur={handleCashSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCashSubmit();
                  if (e.key === 'Escape') setIsEditingCash(false);
                }}
                className="font-bold text-white text-[15px] bg-[#192633] border border-[#233648] rounded px-1 py-0 w-28 -ml-1 focus:outline-none focus:border-primary"
              />
            ) : (
              <span className="font-bold text-white text-[15px] group-hover:text-primary transition-colors">
                {formatCurrency(portfolio.cash)}
              </span>
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[#92adc9] text-[10px] uppercase font-semibold tracking-wider">当日損益</span>
            <span className={`font-bold text-[15px] ${dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}
              <span className="text-[10px] opacity-80 ml-1 font-medium">({dailyPnLPercent >= 0 ? '+' : ''}{dailyPnLPercent.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[#92adc9] text-[10px] uppercase font-semibold tracking-wider">保有銘柄</span>
            <span className="font-bold text-white text-[15px] text-center">{portfolio.positions.length}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative group" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#92adc9]">
            {isSearchingAPI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </div>
          <input
            className="block w-64 p-2 pl-10 text-sm text-white bg-[#192633] border border-[#233648] rounded-lg focus:ring-primary focus:border-primary placeholder-[#92adc9]"
            placeholder="銘柄名、コードで検索"
            type="text"
            value={searchQuery}
            onChange={(e) => {
                setSearchInput(e.target.value);
                setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleSearchKeyDown}
            aria-label="銘柄検索"
          />
          
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#141e27] border border-[#233648] rounded-lg shadow-2xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#233648] bg-[#192633]/50">
                    <span className="text-[10px] font-bold text-[#92adc9] uppercase tracking-wider">検索結果</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {searchResults.map((stock) => (
                        <button
                            key={stock.symbol}
                            onClick={() => handleStockSelect(stock)}
                            className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#192633] transition-colors group"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-white text-sm">{stock.symbol}</span>
                                <span className="text-[10px] text-[#92adc9]">{stock.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-bold",
                                    stock.market === 'japan' ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                                )}>
                                    {stock.market === 'japan' ? 'JP' : 'US'}
                                </span>
                                {watchlist.some(s => s.symbol === stock.symbol) ? (
                                    <span className="text-[10px] text-green-500 font-bold">追加済み</span>
                                ) : (
                                    <Plus className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
          )}
        </div>
        <button
          onClick={toggleConnection}
          className="flex items-center gap-2"
          aria-label={isConnected ? "サーバーから切断" : "サーバーに接続"}
          title={isConnected ? "切断" : "接続"}
        >
          <span className={`flex h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-[#92adc9]">
            {isConnected ? '接続済み' : '未接続'}
          </span>
          {isConnected ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
        </button>
        <button
          onClick={() => alert('設定機能は現在開発中です')}
          className="p-2 text-[#92adc9] hover:text-white rounded-lg hover:bg-[#192633] transition-colors"
          aria-label="設定"
          title="設定"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => alert('ユーザープロフィール機能は現在開発中です')}
          className="p-2 text-[#92adc9] hover:text-white rounded-lg hover:bg-[#192633] transition-colors"
          aria-label="ユーザープロフィール"
          title="ユーザープロフィール"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
