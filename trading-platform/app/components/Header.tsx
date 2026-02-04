'use client';

import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { Search, Settings, User, Loader2, X, TrendingUp, Star, Plus } from 'lucide-react';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { formatCurrency, cn } from '@/app/lib/utils';
import { ALL_STOCKS, fetchStockMetadata } from '@/app/data/stocks';
import { Stock } from '@/app/types';
import { NotificationCenter } from './NotificationCenter';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useTranslations } from '@/app/i18n/provider';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { useResilientWebSocket } from '@/app/hooks/useResilientWebSocket';

export const Header = memo(function Header() {
  const t = useTranslations();
  const { portfolio, setCash } = usePortfolioStore();
  const { setSelectedStock } = useUIStore();
  const { watchlist, addToWatchlist } = useWatchlistStore();

  // Use resilient WebSocket with metrics
  const { status: wsStatus, metrics, reconnect } = useResilientWebSocket({
    enabled: true,
    reconnectOnMount: true,
  });

  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const [searchQuery, setSearchInput] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const dailyPnL = portfolio.dailyPnL;
  const denominator = portfolio.totalValue - dailyPnL;
  const dailyPnLPercent = (portfolio.totalValue > 0 && denominator !== 0) ? (dailyPnL / denominator) * 100 : 0;

  useEffect(() => {
    if (isEditingCash && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
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

  const handleCashClick = useCallback(() => {
    setCashInput(portfolio.cash.toString());
    setIsEditingCash(true);
  }, [portfolio.cash]);

  const handleCashSubmit = useCallback(() => {
    const newCash = parseFloat(cashInput);
    if (!isNaN(newCash) && newCash >= 0) {
      setCash(newCash);
    }
    setIsEditingCash(false);
  }, [cashInput, setCash]);

  const handleStockSelect = useCallback((stock: Stock) => {
    addToWatchlist(stock);
    setSelectedStock(stock);
    setSearchInput('');
    setShowResults(false);
    inputRef.current?.blur();
  }, [addToWatchlist, setSelectedStock, setSearchInput, setShowResults]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return ALL_STOCKS.filter(s =>
      s.symbol.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [searchQuery]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery]);

  const handleSearchKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        e.preventDefault();
        handleStockSelect(searchResults[highlightedIndex]);
        return;
      }

      const query = searchQuery.trim().toUpperCase();
      if (!query) return;

      const exactMatch = ALL_STOCKS.find(s => s.symbol.toUpperCase() === query);
      if (exactMatch) {
        handleStockSelect(exactMatch);
        return;
      }

      if (searchResults.length === 1) {
        handleStockSelect(searchResults[0]);
        return;
      }

      if (query.length >= 2) {
        setIsSearchingAPI(true);
        try {
          const newStock = await fetchStockMetadata(query);
          if (newStock) {
            handleStockSelect(newStock);
          } else {
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
      inputRef.current?.blur();
    }
  }, [searchQuery, searchResults, handleStockSelect, setShowResults, highlightedIndex]);

  const pnlColor = dailyPnL >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlBgColor = dailyPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10';
  const pnlIcon = dailyPnL >= 0 
    ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;

  return (
    <header className="h-14 flex items-center justify-between px-2 sm:px-4 border-b border-[#233648] bg-[#101922] shrink-0 z-10 shadow-sm">
      {/* Left Section - Logo & Portfolio */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 text-primary shrink-0">
          <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4 3h2v11h-2V10zm4-6h2v17h-2V4zm4 4h2v13h-2V8z" />
          </svg>
          <h1 className="text-white text-sm sm:text-base lg:text-lg font-bold tracking-tight">TRADER PRO</h1>
        </div>
        <div className="hidden sm:block h-6 w-px bg-[#233648] shrink-0" />
        
        {/* Portfolio Stats */}
        <div className="hidden lg:flex gap-4 xl:gap-8 text-sm tabular-nums">
          <div className="flex flex-col leading-tight group cursor-pointer relative" onClick={handleCashClick}>
            <span className="text-[#92adc9] text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
              資金
            </span>
            {isEditingCash ? (
              <input
                id="cashInput"
                ref={inputRef}
                type="number"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                onBlur={handleCashSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCashSubmit();
                  if (e.key === 'Escape') setIsEditingCash(false);
                }}
                className="font-bold text-white text-[15px] bg-[#192633] border border-[#233648] rounded px-2 py-0.5 w-32 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            ) : (
              <span className="font-bold text-white text-[15px] group-hover:text-primary transition-colors">
                {formatCurrency(portfolio.cash)}
              </span>
            )}
          </div>
          
          <div className="flex flex-col leading-tight">
            <span className="text-[#92adc9] text-[10px] uppercase font-semibold tracking-wider">本日P&L</span>
            <div className={cn("flex items-center gap-1 font-bold text-[15px]", pnlColor)}>
              {pnlIcon}
              <span>{dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}</span>
              <span className="text-[10px] opacity-80">({dailyPnLPercent >= 0 ? '+' : ''}{dailyPnLPercent.toFixed(1)}%)</span>
            </div>
          </div>
          
          <div className="flex flex-col leading-tight">
            <span className="text-[#92adc9] text-[10px] uppercase font-semibold tracking-wider">保有ポジション</span>
            <span className="font-bold text-white text-[15px] text-center">{portfolio.positions.length}</span>
          </div>
        </div>
      </div>

      {/* Right Section - Search & Actions */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 min-w-0 flex-1 justify-end">
        {/* Search Bar */}
        <div className="relative group max-w-[180px] sm:max-w-[220px] md:max-w-xs lg:max-w-sm flex-1" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-3 pointer-events-none">
            {isSearchingAPI ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-primary" />
            ) : (
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#92adc9] group-focus-within:text-primary transition-colors" />
            )}
          </div>
          <input
            id="stockSearch"
            name="stockSearch"
            className={cn(
              "block w-full p-1.5 sm:p-2 pl-8 sm:pl-10 pr-8 sm:pr-10 text-xs sm:text-sm text-white bg-[#192633] border rounded-lg transition-all",
              "focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder-[#92adc9]",
              showResults ? "border-primary ring-2 ring-primary/30" : "border-[#233648]"
            )}
            placeholder={t('header.searchPlaceholder') + '...'}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleSearchKeyDown}
            aria-label={t('header.searchLabel')}
            aria-activedescendant={highlightedIndex >= 0 && searchResults[highlightedIndex] ? `stock-option-${searchResults[highlightedIndex].symbol}` : undefined}
            aria-controls="stock-search-results"
            aria-expanded={showResults}
            role="combobox"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setShowResults(false);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 text-[#92adc9] hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div
            id="stock-search-results"
            className="absolute top-full right-0 left-0 sm:left-auto w-full sm:w-80 md:w-96 mt-2 bg-[#141e27] border border-[#233648] rounded-lg shadow-2xl z-50 overflow-hidden animate-fade-in-up"
            role="listbox"
          >
            <div className="px-3 py-2 border-b border-[#233648] bg-[#192633]/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#92adc9] uppercase tracking-wider">検索結果</span>
              <span className="text-[10px] text-[#92adc9]">{searchResults.length}件</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searchResults.map((stock, index) => (
                <button
                  key={stock.symbol}
                  id={`stock-option-${stock.symbol}`}
                  onClick={() => handleStockSelect(stock)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 transition-all duration-200 group",
                    index === highlightedIndex 
                      ? "bg-primary/20 border-l-2 border-primary" 
                      : "hover:bg-[#192633] border-l-2 border-transparent"
                  )}
                  role="option"
                  aria-selected={index === highlightedIndex}
                >
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-bold text-white text-xs sm:text-sm">{stock.symbol}</span>
                    <span className="text-[9px] sm:text-[10px] text-[#92adc9] truncate max-w-[120px] sm:max-w-[180px]">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className={cn(
                      "text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded font-bold whitespace-nowrap",
                      stock.market === 'japan' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                    )}>
                      {stock.market === 'japan' ? '🇯🇵 JP' : '🇺🇸 US'}
                    </span>
                    {watchlist.some(s => s.symbol === stock.symbol) ? (
                      <span className="text-[9px] sm:text-[10px] text-green-400 font-bold flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                        <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                        <span className="hidden sm:inline">追加済み</span>
                      </span>
                    ) : (
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats for Mobile/Tablet */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          <div className={cn("px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap", pnlBgColor, pnlColor)}>
            {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL, 'JPY')}
          </div>
        </div>

        {/* Connection Indicator */}
        <div className="shrink-0">
          <ConnectionQualityIndicator 
            status={wsStatus}
            metrics={metrics}
            onReconnect={reconnect}
          />
        </div>

        {/* Notifications */}
        <div className="shrink-0">
          <NotificationCenter />
        </div>

        {/* Language Switcher - Hidden on smallest screens */}
        <div className="hidden xs:block shrink-0">
          <LocaleSwitcher />
        </div>

        {/* Settings */}
        <button
          onClick={() => alert('設定機能は現在開発中です')}
          className="hidden sm:flex p-1.5 sm:p-2 text-[#92adc9] hover:text-white rounded-lg hover:bg-[#192633] transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shrink-0"
          aria-label="設定"
          title="設定"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* User Profile */}
        <button
          onClick={() => alert('ユーザープロフィール機能は現在開発中です')}
          className="hidden sm:flex p-1.5 sm:p-2 text-[#92adc9] hover:text-white rounded-lg hover:bg-[#192633] transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shrink-0"
          aria-label="ユーザープロフィール"
          title="ユーザープロフィール"
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
});
