/**
 * バックテストサービス
 * 
 * このモジュールは、過去のデータを使用して取引戦略を検証するバックテスト機能を提供します。
 */

import { OHLCV, Stock, Signal, BacktestResult, BacktestTrade } from '../types';

import { logger } from '@/app/core/logger';
interface BacktestPosition {
  symbol: string;
  type: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  entryDate: string;
  value: number; // ポジションの初期価値（quantity × entryPrice）
}
import { mlPredictionService } from './mlPrediction';
  // import { calculateReturns } from './utils';

export interface BacktestConfig {
  initialCapital: number;
  commission: number; // 手数料（円または%）
  slippage: number; // スリッページ（%）
  maxPositionSize?: number; // 最大ポジションサイズ（%）
  riskPerTrade?: number; // 1取引当たりのリスク（%）
  startDate?: string;
  endDate?: string;
}

export interface BacktestProgressCallback {
  (progress: number, currentDataPoint: number, totalDataPoints: number): void;
}

export class BacktestService {
  /**
   * バックテストを実行
   */
  async runBacktest(
    stock: Stock,
    historicalData: OHLCV[],
    config: BacktestConfig,
    onProgress?: BacktestProgressCallback
  ): Promise<BacktestResult> {
    // 期間指定がある場合はデータをフィルタリング
    let filteredData = historicalData;
    if (config.startDate || config.endDate) {
      filteredData = this.filterByDateRange(historicalData, config.startDate, config.endDate);
    }

    if (filteredData.length < 50) { // 最低限のデータポイント数を確認
      throw new Error('Insufficient data for backtesting');
    }

    // 初期資産
    let capital = config.initialCapital;
    let equity = config.initialCapital;
    let maxEquity = config.initialCapital;
    let minEquity = config.initialCapital;
    
    // トレード履歴
    const trades: BacktestTrade[] = [];
    
    // ポジション管理
    let currentPosition: {
      symbol: string;
      type: 'LONG' | 'SHORT';
      quantity: number;
      entryPrice: number;
      entryDate: string;
      value: number;
    } | null = null;

    // 各データポイントでシミュレーションを実行
    for (let i = 50; i < filteredData.length; i++) { // 最初の50ポイントは指標計算用
      const currentData = filteredData.slice(0, i + 1);
      const currentCandle = filteredData[i];

      // 進行状況のコールバック
      if (onProgress) {
        onProgress(i / filteredData.length * 100, i, filteredData.length);
      }

      // ここでは単純化のために毎日シグナルを生成（実際にはもっと少ない頻度）
      if (i % 5 === 0) { // 5日ごとにシグナルを評価（例として）
        try {
          // シグナル生成（実際にはindicatorも計算する必要がある）
          const indicators = mlPredictionService.calculateIndicators(currentData);
          const prediction = mlPredictionService.predict(stock, currentData, indicators);
          const signal = mlPredictionService.generateSignal(stock, currentData, prediction, indicators);

          // 現在のポジションとシグナルを比較して取引判断
          const trade = this.evaluateTrade(
            signal,
            currentCandle,
            currentPosition,
            capital,
            config
          );

          if (trade) {
            // 取引を実行
            const executionResult = this.executeTrade(
              trade,
              currentCandle,
              config,
              capital
            );

            if (executionResult.success) {
              capital = executionResult.newCapital;
              equity = executionResult.newEquity;

              // 最大/最小equityを更新
              if (equity > maxEquity) maxEquity = equity;
              if (equity < minEquity) minEquity = equity;

              // トレードを記録
              trades.push(executionResult.trade);
              
              // ポジションを更新
              currentPosition = executionResult.newPosition;
            }
          }
        } catch (error) {
          logger.error('Error during backtest simulation:', error instanceof Error ? error : new Error(String(error)));
          // エラーが発生しても処理を続ける
        }
      }

      // ポジションの評価損益を更新
      if (currentPosition) {
        const currentValue = currentPosition.quantity * currentCandle.close;
        const pnl = currentPosition.type === 'LONG' 
          ? currentValue - currentPosition.value
          : currentPosition.value - currentValue;
          
        equity = config.initialCapital + trades.reduce((sum, trade) => {
          // Check if trade is effectively closed (has exit price)
          if (trade.exitPrice !== undefined) {
            return sum + (trade.profitPercent! / 100 * config.initialCapital);
          }
          return sum;
        }, 0) + (currentPosition.value !== currentValue ? pnl : 0);
      }
    }

    // すべてのオープンポジションをクローズ
    if (currentPosition) {
      const finalCandle = filteredData[filteredData.length - 1];
      const closingTrade: BacktestTrade = {
        symbol: currentPosition.symbol,
        type: currentPosition.type === 'LONG' ? 'SELL' : 'BUY',
        entryPrice: currentPosition.entryPrice,
        exitPrice: finalCandle.close,
        entryDate: currentPosition.entryDate,
        exitDate: finalCandle.date,
        profitPercent: this.calculateProfitPercent(
          currentPosition.entryPrice,
          finalCandle.close,
          currentPosition.type
        ),
        reason: 'Position closed at end of backtest period'
      };
      
      trades.push(closingTrade);
    }

    // バックテスト結果を計算
    return this.calculateBacktestMetrics(
      stock.symbol,
      trades,
      config.initialCapital,
      filteredData[0].date,
      filteredData[filteredData.length - 1].date
    );
  }

  /**
   * 期間でデータをフィルタリング
   */
  private filterByDateRange(data: OHLCV[], startDate?: string, endDate?: string): OHLCV[] {
    return data.filter(candle => {
      if (startDate && candle.date < startDate) return false;
      if (endDate && candle.date > endDate) return false;
      return true;
    });
  }

  /**
   * 取引を評価
   */
  private evaluateTrade(
    signal: Signal,
    currentCandle: OHLCV,
    currentPosition: BacktestPosition | null,
    capital: number,
    config: BacktestConfig
  ): {
    type: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT';
    signal: Signal;
  } | null {
    // 現在のポジションがない場合、BUYまたはSELLシグナルでエントリー
    if (!currentPosition) {
      if (signal.type === 'BUY' && signal.confidence >= 60) {
        return { type: 'ENTER_LONG', signal };
      } else if (signal.type === 'SELL' && signal.confidence >= 60) {
        return { type: 'ENTER_SHORT', signal };
      }
    } 
    // 現在のポジションがある場合、逆方向のシグナルまたはHOLDでエグジット
    else {
      if ((currentPosition.type === 'LONG' && (signal.type === 'SELL' || signal.type === 'HOLD')) ||
          (currentPosition.type === 'SHORT' && (signal.type === 'BUY' || signal.type === 'HOLD'))) {
        return { 
          type: currentPosition.type === 'LONG' ? 'EXIT_LONG' : 'EXIT_SHORT', 
          signal 
        };
      }
    }

    return null;
  }

  /**
   * 取引を実行
   */
  private executeTrade(
    trade: {
      type: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT';
      signal: Signal;
    },
    currentCandle: OHLCV,
    config: BacktestConfig,
    currentCapital: number
  ): {
    success: boolean;
    newCapital: number;
    newEquity: number;
    trade: BacktestTrade;
    newPosition: BacktestPosition | null;
  } {
    let newCapital = currentCapital;
    let newPosition: BacktestPosition | null = null;
    let tradeRecord: BacktestTrade;

    if (trade.type.startsWith('ENTER')) {
      // エントリー取引
      const direction = trade.type === 'ENTER_LONG' ? 'BUY' : 'SELL';
      const price = this.applySlippage(currentCandle.close, direction, config.slippage);
      
      // ポジションサイズを計算（リスク管理）
      const riskAmount = currentCapital * (config.riskPerTrade || 0.02); // デフォルトで2%
      const stopLossDistance = Math.abs(price - trade.signal.stopLoss);
      const positionSize = riskAmount / stopLossDistance;
      
      // 最大ポジションサイズの制限
      const maxPositionValue = currentCapital * (config.maxPositionSize || 0.1); // デフォルトで10%
      const calculatedQuantity = Math.min(
        positionSize,
        maxPositionValue / price
      );
      
      const quantity = Math.floor(calculatedQuantity); // 整数株数
      
      if (quantity > 0) {
        const cost = quantity * price + config.commission;
        
        if (cost <= currentCapital) {
          // 取引を記録
          tradeRecord = {
            symbol: trade.signal.symbol,
            type: direction,
            entryPrice: price,
            exitPrice: 0, // Placeholder
            entryDate: currentCandle.date,
            exitDate: '', // Placeholder
            profitPercent: 0,
            reason: trade.signal.reason
          };
          
          newCapital = currentCapital - cost;
          newPosition = {
            symbol: trade.signal.symbol,
            type: direction === 'BUY' ? 'LONG' : 'SHORT',
            quantity,
            entryPrice: price,
            entryDate: currentCandle.date,
            value: quantity * price
          };
        } else {
          // 資金不足の場合は取引をスキップ
          return {
            success: false,
            newCapital: currentCapital,
            newEquity: currentCapital,
            trade: {} as BacktestTrade,
            newPosition: null
          };
        }
      } else {
        // ポジションサイズが小さすぎる場合は取引をスキップ
        return {
          success: false,
          newCapital: currentCapital,
          newEquity: currentCapital,
          trade: {} as BacktestTrade,
          newPosition: null
        };
      }
    } else {
      // エグジット取引
      if (!newPosition) {
        // エグジットするポジションがない場合は何もしない
        return {
          success: false,
          newCapital: currentCapital,
          newEquity: currentCapital,
          trade: {} as BacktestTrade,
          newPosition: null
        };
      }

      // newPosition はここで non-null であることが保証される
      const position: BacktestPosition = newPosition; // 型アノテーションを明示
      const direction = trade.type === 'EXIT_LONG' ? 'SELL' : 'BUY';
      const price = this.applySlippage(currentCandle.close, direction, config.slippage);

      // 利益計算
      let profitPercent: number;
      if (position.type === 'LONG') {
        profitPercent = ((price - position.entryPrice) / position.entryPrice) * 100;
      } else {
        profitPercent = ((position.entryPrice - price) / position.entryPrice) * 100;
      }

      // 手数料を考慮
      const proceeds = position.quantity * price - config.commission;
      newCapital = currentCapital + proceeds;

      // 取引を記録
      tradeRecord = {
        symbol: position.symbol,
        type: direction,
        entryPrice: position.entryPrice,
        exitPrice: price,
        entryDate: position.entryDate,
        exitDate: currentCandle.date,
        profitPercent,
        reason: 'Position exited based on signal'
      };

      newPosition = null;
    }

    return {
      success: true,
      newCapital,
      newEquity: newCapital,
      trade: tradeRecord!,
      newPosition
    };
  }

  /**
   * スリッページを適用
   */
  private applySlippage(price: number, direction: 'BUY' | 'SELL', slippage: number): number {
    if (direction === 'BUY') {
      return price * (1 + slippage / 100);
    } else {
      return price * (1 - slippage / 100);
    }
  }

  /**
   * 利益率を計算
   */
  private calculateProfitPercent(entryPrice: number, exitPrice: number, type: 'LONG' | 'SHORT'): number {
    if (type === 'LONG') {
      return ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - exitPrice) / entryPrice) * 100;
    }
  }

  /**
   * バックテストメトリクスを計算
   */
  private calculateBacktestMetrics(
    symbol: string,
    trades: BacktestTrade[],
    initialCapital: number,
    startDate: string,
    endDate: string
  ): BacktestResult {
    const closedTrades = trades.filter(trade => trade.exitPrice !== 0 && trade.exitDate !== '');
    
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(trade => (trade.profitPercent || 0) > 0).length;
    const losingTrades = totalTrades - winningTrades;
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const totalReturn = closedTrades.reduce((sum, trade) => sum + (trade.profitPercent || 0), 0);
    
    const profits = closedTrades.filter(trade => (trade.profitPercent || 0) > 0).map(t => t.profitPercent || 0);
    const losses = closedTrades.filter(trade => (trade.profitPercent || 0) < 0).map(t => t.profitPercent || 0);
    
    const avgProfit = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    
    const profitFactor = avgLoss !== 0 ? avgProfit / Math.abs(avgLoss) : Infinity;
    
    // 最大ドローダウンの計算（簡易版）
    let peak = initialCapital;
    let maxDrawdown = 0;
    let currentEquity = initialCapital;
    
    for (const trade of closedTrades) {
      const tradeReturn = (trade.profitPercent || 0) / 100 * initialCapital;
      currentEquity += tradeReturn;
      
      if (currentEquity > peak) {
        peak = currentEquity;
      }
      
      const drawdown = ((peak - currentEquity) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    // シャープレシオの計算（簡易版）
    const returns = closedTrades.map(trade => trade.profitPercent || 0);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const excessReturn = avgReturn; // 無リスクレートを0と仮定
    const volatility = returns.length > 1 
      ? Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(n - (returns.reduce((a, b) => a + b, 0) / returns.length), 2), 0) / (returns.length - 1))
      : 0;
    const sharpeRatio = volatility !== 0 ? excessReturn / volatility : 0;

    return {
      symbol,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalReturn,
      avgProfit,
      avgLoss,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
      trades: closedTrades,
      startDate,
      endDate
    };
  }
}

export const backtestService = new BacktestService();