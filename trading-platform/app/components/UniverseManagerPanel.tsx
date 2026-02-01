/**
 * Universe Manager Panel Component
 * 
 * Manages stock universe with add/remove functionality,
 * search, and statistics display.
 */

'use client';

import { useState, useEffect } from 'react';
import { useUniverseStore } from '@/app/store/universeStore';
import { UniverseStock, UniverseStats } from '@/app/lib/universe/UniverseManager';
import { cn, formatCurrency } from '@/app/lib/utils';

export function UniverseManagerPanel() {
  const {
    stocks,
    stats,
    isLoading,
    error,
    isInitialized,
    initialize,
    addStock,
    removeStock,
    validateSymbol,
    searchStocks,
    setStockActive,
    updateUniverse,
  } = useUniverseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const filteredStocks = searchQuery
    ? searchStocks(searchQuery)
    : stocks;

  const handleAddStock = async () => {
    if (!newSymbol.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateSymbol(newSymbol);
      setValidationResult(result);

      if (result.valid) {
        await addStock(newSymbol);
        setNewSymbol('');
        setShowAddModal(false);
        setValidationResult(null);
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate symbol',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (confirm(`${symbol} をユニバースから削除しますか？`)) {
      removeStock(symbol);
    }
  };

  const handleToggleActive = async (symbol: string, active: boolean) => {
    setStockActive(symbol, active);
  };

  const handleUpdateUniverse = async () => {
    await updateUniverse();
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[#92adc9]">ユニバースを初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && <StatsOverview stats={stats} />}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="銘柄を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141e27] border border-[#233648] rounded-lg px-4 py-2 pl-10 text-white placeholder-[#92adc9] focus:outline-none focus:border-primary"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#92adc9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdateUniverse}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#233648] hover:bg-[#2d4159] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            銘柄追加
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stock List */}
      <div className="bg-[#141e27] border border-[#233648] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#192633]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#92adc9] uppercase tracking-wider">
                  銘柄
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#92adc9] uppercase tracking-wider">
                  セクター
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#92adc9] uppercase tracking-wider">
                  市場
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#92adc9] uppercase tracking-wider">
                  時価総額
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#92adc9] uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#92adc9] uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#233648]">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#92adc9]">
                    {searchQuery ? '該当する銘柄が見つかりません' : '銘柄が登録されていません'}
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => (
                  <StockRow
                    key={stock.symbol}
                    stock={stock}
                    onRemove={handleRemoveStock}
                    onToggleActive={handleToggleActive}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <AddStockModal
          onClose={() => {
            setShowAddModal(false);
            setNewSymbol('');
            setValidationResult(null);
          }}
          onAdd={handleAddStock}
          symbol={newSymbol}
          onSymbolChange={setNewSymbol}
          isValidating={isValidating}
          validationResult={validationResult}
        />
      )}
    </div>
  );
}

interface StatsOverviewProps {
  stats: UniverseStats;
}

function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        title="総銘柄数"
        value={stats.totalStocks}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      />
      <StatCard
        title="アクティブ銘柄"
        value={stats.activeStocks}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatCard
        title="米国銘柄"
        value={stats.usaStocks}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
        }
      />
      <StatCard
        title="日本銘柄"
        value={stats.japanStocks}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4" />
          </svg>
        }
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-[#141e27] border border-[#233648] rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-[#92adc9] text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

interface StockRowProps {
  stock: UniverseStock;
  onRemove: (symbol: string) => void;
  onToggleActive: (symbol: string, active: boolean) => void;
}

function StockRow({ stock, onRemove, onToggleActive }: StockRowProps) {
  return (
    <tr className="hover:bg-[#192633] transition-colors">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-white">{stock.symbol}</div>
          <div className="text-xs text-[#92adc9]">{stock.name}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 bg-[#233648] rounded text-xs text-[#92adc9]">
          {stock.sector}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          stock.market === 'usa' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
        )}>
          {stock.market === 'usa' ? 'USA' : 'JP'}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-white font-medium">
        {formatCurrency(stock.marketCap)}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleActive(stock.symbol, !stock.active)}
          className={cn(
            'w-3 h-3 rounded-full transition-colors',
            stock.active ? 'bg-green-500' : 'bg-[#92adc9]'
          )}
          title={stock.active ? 'アクティブ' : '非アクティブ'}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onRemove(stock.symbol)}
          className="text-red-500 hover:text-red-400 transition-colors"
          title="削除"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

interface AddStockModalProps {
  onClose: () => void;
  onAdd: () => void;
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  isValidating: boolean;
  validationResult: any;
}

function AddStockModal({ onClose, onAdd, symbol, onSymbolChange, isValidating, validationResult }: AddStockModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">銘柄を追加</h3>
          <button
            onClick={onClose}
            className="text-[#92adc9] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#92adc9] mb-2">
              銘柄コード
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
              placeholder="AAPL または 7203"
              className="w-full bg-[#192633] border border-[#233648] rounded-lg px-4 py-2 text-white placeholder-[#92adc9] focus:outline-none focus:border-primary"
              disabled={isValidating}
            />
          </div>

          {validationResult && (
            <div className={cn(
              'p-3 rounded-lg',
              validationResult.valid ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'
            )}>
              <p className={cn(
                'text-sm',
                validationResult.valid ? 'text-green-400' : 'text-red-400'
              )}>
                {validationResult.valid
                  ? `${validationResult.name} (${validationResult.sector})`
                  : validationResult.error}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#233648] hover:bg-[#2d4159] text-white text-sm font-medium rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onAdd}
              disabled={!symbol.trim() || isValidating || (validationResult && !validationResult.valid)}
              className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? '検証中...' : '追加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
