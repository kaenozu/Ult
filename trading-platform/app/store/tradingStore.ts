import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Position, Portfolio, JournalEntry, Theme, AIStatus, Signal, PaperTrade } from '../types';
import { AI_TRADING, POSITION_SIZING, MARKET_CORRELATION } from '@/app/constants';

interface TradingStore {
  theme: Theme;
  toggleTheme: () => void;
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateStockData: (symbol: string, data: Partial<Stock>) => void;
  batchUpdateStockData: (updates: { symbol: string, data: Partial<Stock> }[]) => void;
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  closePosition: (symbol: string, exitPrice: number) => void;
  setCash: (amount: number) => void;
  journal: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;
  isConnected: boolean;
  toggleConnection: () => void;
  aiStatus: AIStatus; // AI専用の仮想口座
  processAITrades: (symbol: string, currentPrice: number, signal: Signal | null) => void;
}

const initialPortfolio: Portfolio = {
  positions: [],
  orders: [],
  totalValue: 0,
  totalProfit: 0,
  dailyPnL: 0,
  cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
};

const initialAIStatus: AIStatus = {
  virtualBalance: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
  totalProfit: 0,
  trades: [],
};

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      watchlist: [],

      addToWatchlist: (stock) => set((state) => {
        if (state.watchlist.find(s => s.symbol === stock.symbol)) {
          return state;
        }
        return { watchlist: [...state.watchlist, stock] };
      }),

      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter(s => s.symbol !== symbol),
      })),

      updateStockData: (symbol, data) => set((state) => {
        const newWatchlist = state.watchlist.map(s => 
          s.symbol === symbol ? { ...s, ...data } : s
        );
        
        const newPositions = state.portfolio.positions.map(p => 
          p.symbol === symbol ? { 
            ...p, 
            currentPrice: data.price ?? p.currentPrice,
            change: data.change ?? p.change 
          } : p
        );

        const dailyPnL = newPositions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

        return {
          watchlist: newWatchlist,
          portfolio: {
            ...state.portfolio,
            positions: newPositions,
            dailyPnL
          }
        };
      }),

      batchUpdateStockData: (updates) => set((state) => {
        const updateMap = new Map(updates.map(u => [u.symbol, u.data]));

        return {
          watchlist: state.watchlist.map(s => {
            const update = updateMap.get(s.symbol);
            return update ? { ...s, ...update } : s;
          }),
          portfolio: {
            ...state.portfolio,
            positions: state.portfolio.positions.map(p => {
              const update = updateMap.get(p.symbol);
              return update && update.price ? { ...p, currentPrice: update.price } : p;
            })
          }
        };
      }),

      portfolio: initialPortfolio,

      updatePortfolio: (positions) => set((state) => {
        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => sum + (p.currentPrice - p.avgPrice) * p.quantity, 0);
        const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);
        return {
          portfolio: {
            ...state.portfolio,
            positions,
            totalValue,
            totalProfit,
            dailyPnL,
          },
        };
      }),

      addPosition: (newPosition) => set((state) => {
        const positions = [...state.portfolio.positions];
        const existingIndex = positions.findIndex(p => p.symbol === newPosition.symbol && p.side === newPosition.side);

        if (existingIndex >= 0) {
          const existing = positions[existingIndex];
          const totalCost = (existing.avgPrice * existing.quantity) + (newPosition.avgPrice * newPosition.quantity);
          const totalQty = existing.quantity + newPosition.quantity;
          
          positions[existingIndex] = {
            ...existing,
            quantity: totalQty,
            avgPrice: totalCost / totalQty,
            currentPrice: newPosition.currentPrice,
            change: newPosition.change
          };
        } else {
          positions.push(newPosition);
        }

        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => {
          const pnl = p.side === 'LONG' 
            ? (p.currentPrice - p.avgPrice) * p.quantity
            : (p.avgPrice - p.currentPrice) * p.quantity;
          return sum + pnl;
        }, 0);
        const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);
        
        return {
          portfolio: {
            ...state.portfolio,
            positions,
            totalValue,
            totalProfit,
            dailyPnL,
          },
        };
      }),

      closePosition: (symbol, exitPrice) => set((state) => {
        const position = state.portfolio.positions.find(p => p.symbol === symbol);
        if (!position) return state;

        const profit = position.side === 'LONG'
          ? (exitPrice - position.avgPrice) * position.quantity
          : (position.avgPrice - exitPrice) * position.quantity;
          
        const profitPercent = position.side === 'LONG'
          ? ((exitPrice - position.avgPrice) / position.avgPrice) * 100
          : ((position.avgPrice - exitPrice) / position.avgPrice) * 100;

        const entry: JournalEntry = {
          id: Date.now().toString(),
          symbol,
          date: position.entryDate,
          signalType: position.side === 'LONG' ? 'BUY' : 'SELL',
          entryPrice: position.avgPrice,
          exitPrice,
          quantity: position.quantity,
          profit,
          profitPercent,
          notes: '',
          status: 'CLOSED',
        };

        const positions = state.portfolio.positions.filter(p => p.symbol !== symbol);
        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => {
          const pnl = p.side === 'LONG' 
            ? (p.currentPrice - p.avgPrice) * p.quantity
            : (p.avgPrice - p.currentPrice) * p.quantity;
          return sum + pnl;
        }, 0);
        const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            totalValue,
            totalProfit,
            dailyPnL,
            // Return capital + profit to cash
            cash: state.portfolio.cash + (position.avgPrice * position.quantity) + profit, 
          },
          journal: [...state.journal, entry],
        };
      }),

      setCash: (amount) => set((state) => ({
        portfolio: {
          ...state.portfolio,
          cash: amount,
        },
      })),

      journal: [],

      addJournalEntry: (entry) => set((state) => ({
        journal: [...state.journal, entry],
      })),

      selectedStock: null,

      setSelectedStock: (stock) => set({ selectedStock: stock }),

      isConnected: true,

      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),

      aiStatus: initialAIStatus,

      processAITrades: (symbol, currentPrice, signal) => {
        const { aiStatus } = get();
        const slippage = POSITION_SIZING.SLIPPAGE_PERCENTAGE;

        // Check for existing position
        const openTrade = aiStatus.trades.find(t => t.symbol === symbol && t.status === 'OPEN');

        if (openTrade) {
          let shouldClose = false;
          let reflection = "";

          if (signal) {
            if (openTrade.type === 'BUY') {
              if (currentPrice >= signal.targetPrice) {
                shouldClose = true;
                reflection = "利確ターゲット到達。AI予測通りの反発を利益に変えました。";
              } else if (currentPrice <= signal.stopLoss) {
                shouldClose = true;
                reflection = "損切りライン接触。想定以上の売り圧力により予測を逸脱。";
              } else if (signal.type === 'SELL') {
                shouldClose = true;
                reflection = "トレンド転換シグナルを検出し、エグジット。";
              }
            } else if (openTrade.type === 'SELL') {
              if (currentPrice <= signal.targetPrice) {
                shouldClose = true;
                reflection = "空売り利確成功。目標値での買い戻しを完了。";
              } else if (currentPrice >= signal.stopLoss) {
                shouldClose = true;
                reflection = "上昇トレンドへの回帰を確認。ショートカバーを実行。";
              } else if (signal.type === 'BUY') {
                shouldClose = true;
                reflection = "上昇シグナル発生により、空売りポジションを解消。";
              }
            }
          }

          if (shouldClose) {
            const exitPrice = openTrade.type === 'BUY' ? currentPrice * (1 - slippage) : currentPrice * (1 + slippage);
            const profit = openTrade.type === 'BUY'
              ? (exitPrice - openTrade.entryPrice) * openTrade.quantity
              : (openTrade.entryPrice - exitPrice) * openTrade.quantity;
            const profitPercent = (profit / (openTrade.entryPrice * openTrade.quantity)) * 100;

            // マクロ連動型の反省コメントを生成
            let advancedReflection = reflection;
            if (signal?.marketContext) {
              const { indexSymbol, correlation, indexTrend } = signal.marketContext;
              const isMarketDrag = (openTrade.type === 'BUY' && indexTrend === 'DOWN') || (openTrade.type === 'SELL' && indexTrend === 'UP');

              if (profitPercent < 0 && isMarketDrag && correlation > MARKET_CORRELATION.STRONG_THRESHOLD) {
                advancedReflection = `${reflection} 個別要因よりも、${indexSymbol}の${indexTrend === 'DOWN' ? '下落' : '上昇'}による市場全体の地合い(r=${correlation.toFixed(2)})に強く引きずられた形です。`;
              } else if (profitPercent > 0 && !isMarketDrag && correlation > MARKET_CORRELATION.STRONG_THRESHOLD) {
                advancedReflection = `${reflection} ${indexSymbol}の良好な地合い(r=${correlation.toFixed(2)})が予測を強力に後押ししました。`;
              }
            }

            const updatedTrades = aiStatus.trades.map(t =>
              t.id === openTrade.id
                ? { ...t, status: 'CLOSED' as const, exitPrice, exitDate: new Date().toISOString(), profitPercent, reflection: advancedReflection }
                : t
            );

            set({
              aiStatus: {
                ...aiStatus,
                virtualBalance: aiStatus.virtualBalance + (openTrade.entryPrice * openTrade.quantity) + profit,
                totalProfit: aiStatus.totalProfit + profit,
                trades: updatedTrades
              }
            });
            return;
          }
        }

        // New Entry Logic (Only for strong signals)
        const HIGH_CONFIDENCE_THRESHOLD = 80;
        if (!openTrade && signal && signal.confidence >= HIGH_CONFIDENCE_THRESHOLD && signal.type !== 'HOLD') {
          const entryPrice = signal.type === 'BUY' ? currentPrice * (1 + slippage) : currentPrice * (1 - slippage);
          const quantity = Math.floor((aiStatus.virtualBalance * POSITION_SIZING.DEFAULT_RATIO) / entryPrice);

          if (quantity > 0) {
            const newTrade: PaperTrade = {
              id: Math.random().toString(36).substring(7),
              symbol,
              type: signal.type as 'BUY' | 'SELL',
              entryPrice,
              quantity,
              status: 'OPEN',
              entryDate: new Date().toISOString(),
            };

            set({
              aiStatus: {
                ...aiStatus,
                virtualBalance: aiStatus.virtualBalance - (entryPrice * quantity),
                trades: [newTrade, ...aiStatus.trades]
              }
            });
          }
        }
      }
    }),
    {
      name: 'trading-platform-storage',
      partialize: (state) => ({
        theme: state.theme,
        watchlist: state.watchlist,
        journal: state.journal,
        portfolio: state.portfolio,
        aiStatus: state.aiStatus,
      }),
    }
  )
);