'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Settings, User, Wifi, WifiOff, Edit2 } from 'lucide-react';
import { useTradingStore } from '@/app/store/tradingStore';
import { formatCurrency } from '@/app/lib/utils';

export function Header() {
  const { portfolio, isConnected, toggleConnection, setCash } = useTradingStore();
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const dailyPnL = portfolio.positions.reduce((sum, p) => {
    const change = (p.currentPrice - p.avgPrice) * p.quantity;
    const prevChange = (p.currentPrice * 0.995 - p.avgPrice) * p.quantity;
    return sum + (change - prevChange);
  }, 0);

  const dailyPnLPercent = (dailyPnL / (portfolio.totalValue - dailyPnL)) * 100;

  useEffect(() => {
    if (isEditingCash && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingCash]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCashSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingCash(false);
    }
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
                onKeyDown={handleKeyDown}
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
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#92adc9]">
            <Search className="w-4 h-4" />
          </div>
          <input
            className="block w-64 p-2 pl-10 text-sm text-white bg-[#192633] border border-[#233648] rounded-lg focus:ring-primary focus:border-primary placeholder-[#92adc9]"
            placeholder="銘柄名、コードで検索"
            type="text"
            aria-label="銘柄検索"
          />
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
          className="p-2 text-[#92adc9] hover:text-white rounded-lg hover:bg-[#192633] transition-colors"
          aria-label="設定"
          title="設定"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
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
