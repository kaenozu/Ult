/**
 * Advanced Stop Loss Strategy Service
 * 
 * このモジュールは、高度なストップロス戦略を実装する機能を提供します。
 * ATRベース、価格レベル、時間ベース、トレーリストップなど複数の戦略を含みます。
 */

import { OHLCV } from '../types';
import { calculateATR } from '@/app/lib/utils';

export interface StopLossStrategy {
  type: 'atr' | 'percentage' | 'price' | 'volatility' | 'time' | 'trailing' | 'chandelier' | 'parabolic_sar';
  value: number;
  enabled: boolean;
}

export interface AdvancedStopLossInput {
  entryPrice: number;
  currentPrice: number;
  positionSide: 'LONG' | 'SHORT';
  atr: number;
  volatility: number;
  timeElapsed: number; // 取引からの経過時間（分）
  priceHistory: OHLCV[];
  trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';
}

export interface StopLossResult {
  stopLossPrice: number;
  shouldExit: boolean;
  exitReason: string;
  confidence: number;
}

class AdvancedStopLossService {
  /**
   * ATRベースのストップロスを計算
   */
  calculateATRStopLoss(input: AdvancedStopLossInput, multiplier: number): StopLossResult {
    const { entryPrice, positionSide, atr } = input;
    let stopLossPrice: number;

    if (positionSide === 'LONG') {
      stopLossPrice = entryPrice - (atr * multiplier);
    } else {
      stopLossPrice = entryPrice + (atr * multiplier);
    }

    const shouldExit = positionSide === 'LONG' 
      ? input.currentPrice <= stopLossPrice 
      : input.currentPrice >= stopLossPrice;

    return {
      stopLossPrice,
      shouldExit,
      exitReason: 'ATR Stop Loss Triggered',
      confidence: 0.8
    };
  }

  /**
   * パーセンテージベースのストップロスを計算
   */
  calculatePercentageStopLoss(input: AdvancedStopLossInput, percentage: number): StopLossResult {
    const { entryPrice, positionSide } = input;
    const stopLossDistance = entryPrice * (percentage / 100);
    let stopLossPrice: number;

    if (positionSide === 'LONG') {
      stopLossPrice = entryPrice - stopLossDistance;
    } else {
      stopLossPrice = entryPrice + stopLossDistance;
    }

    const shouldExit = positionSide === 'LONG' 
      ? input.currentPrice <= stopLossPrice 
      : input.currentPrice >= stopLossPrice;

    return {
      stopLossPrice,
      shouldExit,
      exitReason: 'Percentage Stop Loss Triggered',
      confidence: 0.7
    };
  }

  /**
   * 価格レベルベースのストップロスを計算
   */
  calculatePriceLevelStopLoss(input: AdvancedStopLossInput, stopPrice: number): StopLossResult {
    const { positionSide } = input;
    const shouldExit = positionSide === 'LONG' 
      ? input.currentPrice <= stopPrice 
      : input.currentPrice >= stopPrice;

    return {
      stopLossPrice: stopPrice,
      shouldExit,
      exitReason: 'Price Level Stop Loss Triggered',
      confidence: 0.9
    };
  }

  /**
   * ボラティリティベースのストップロスを計算
   */
  calculateVolatilityStopLoss(input: AdvancedStopLossInput, volatilityMultiplier: number): StopLossResult {
    const { entryPrice, positionSide, volatility } = input;
    const stopLossDistance = entryPrice * volatility * volatilityMultiplier;
    let stopLossPrice: number;

    if (positionSide === 'LONG') {
      stopLossPrice = entryPrice - stopLossDistance;
    } else {
      stopLossPrice = entryPrice + stopLossDistance;
    }

    const shouldExit = positionSide === 'LONG' 
      ? input.currentPrice <= stopLossPrice 
      : input.currentPrice >= stopLossPrice;

    return {
      stopLossPrice,
      shouldExit,
      exitReason: 'Volatility Stop Loss Triggered',
      confidence: 0.75
    };
  }

  /**
   * 時間ベースのストップロスを計算
   */
  calculateTimeStopLoss(input: AdvancedStopLossInput, maxHoldingMinutes: number): StopLossResult {
    const shouldExit = input.timeElapsed >= maxHoldingMinutes;

    return {
      stopLossPrice: input.currentPrice, // 時間ベースでは現在価格を返す
      shouldExit,
      exitReason: 'Time Stop Loss Triggered',
      confidence: 0.6
    };
  }

  /**
   * トレーリストップを計算
   */
  calculateTrailingStopLoss(
    input: AdvancedStopLossInput, 
    trailPercentage: number, 
    highestPrice?: number, 
    lowestPrice?: number
  ): StopLossResult {
    const { positionSide, currentPrice } = input;
    let stopLossPrice: number;
    let shouldExit = false;

    if (positionSide === 'LONG') {
      // LONGポジションの場合は最高値を追跡
      const referenceHigh = highestPrice !== undefined ? highestPrice : currentPrice;
      const trailDistance = referenceHigh * (trailPercentage / 100);
      stopLossPrice = referenceHigh - trailDistance;
      
      shouldExit = currentPrice <= stopLossPrice;
    } else {
      // SHORTポジションの場合は最安値を追跡
      const referenceLow = lowestPrice !== undefined ? lowestPrice : currentPrice;
      const trailDistance = referenceLow * (trailPercentage / 100);
      stopLossPrice = referenceLow + trailDistance;
      
      shouldExit = currentPrice >= stopLossPrice;
    }

    return {
      stopLossPrice,
      shouldExit,
      exitReason: 'Trailing Stop Loss Triggered',
      confidence: 0.85
    };
  }

  /**
   * チンドールストップを計算（ATRを使用した動的ストップ）
   */
  calculateChandelierStopLoss(input: AdvancedStopLossInput, atrMultiplier: number, period: number): StopLossResult {
    const { positionSide, priceHistory, atr } = input;
    let stopLossPrice: number;

    // 指定期間の高値/安値を計算
    const recentCandles = priceHistory.slice(-period);
    if (recentCandles.length === 0) {
      return {
        stopLossPrice: input.entryPrice,
        shouldExit: false,
        exitReason: 'Insufficient data for Chandelier stop',
        confidence: 0
      };
    }

    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));

    if (positionSide === 'LONG') {
      stopLossPrice = highestHigh - (atr * atrMultiplier);
    } else {
      stopLossPrice = lowestLow + (atr * atrMultiplier);
    }

    const shouldExit = positionSide === 'LONG' 
      ? input.currentPrice <= stopLossPrice 
      : input.currentPrice >= stopLossPrice;

    return {
      stopLossPrice,
      shouldExit,
      exitReason: 'Chandelier Stop Loss Triggered',
      confidence: 0.8
    };
  }

  /**
   * パラボリックSARベースのストップロスを計算（簡易版）
   */
  calculateParabolicSARStopLoss(input: AdvancedStopLossInput, accelerationFactor: number, maxAcceleration: number): StopLossResult {
    // 簡易的なパラボリックSARの計算（実際には複雑なアルゴリズムが必要）
    // ここではトレンド方向に基づいた簡易的な計算を行う
    const { positionSide, currentPrice, trendDirection } = input;
    let shouldExit = false;
    const exitReason = 'Parabolic SAR Stop Loss Triggered';
    
    // 簡易的な実装：トレンドが反転したと判断された場合に出口
    if (positionSide === 'LONG' && trendDirection === 'DOWN') {
      shouldExit = true;
    } else if (positionSide === 'SHORT' && trendDirection === 'UP') {
      shouldExit = true;
    }

    return {
      stopLossPrice: currentPrice,
      shouldExit,
      exitReason,
      confidence: 0.7
    };
  }

  /**
   * 複合ストップロス戦略を実行
   */
  executeCompositeStopLoss(
    input: AdvancedStopLossInput,
    strategies: StopLossStrategy[]
  ): StopLossResult {
    let finalStopLossPrice = input.positionSide === 'LONG' ? 0 : Number.MAX_VALUE;
    let shouldExit = false;
    const exitReasons: string[] = [];
    let totalConfidence = 0;
    let activeStrategies = 0;

    for (const strategy of strategies) {
      if (!strategy.enabled) continue;

      let result: StopLossResult | null = null;

      switch (strategy.type) {
        case 'atr':
          result = this.calculateATRStopLoss(input, strategy.value);
          break;
        case 'percentage':
          result = this.calculatePercentageStopLoss(input, strategy.value);
          break;
        case 'price':
          result = this.calculatePriceLevelStopLoss(input, strategy.value);
          break;
        case 'volatility':
          result = this.calculateVolatilityStopLoss(input, strategy.value);
          break;
        case 'time':
          result = this.calculateTimeStopLoss(input, strategy.value);
          break;
        case 'trailing':
          // トレーリストップは特別なパラメータが必要なため、簡略化
          result = this.calculateTrailingStopLoss(input, strategy.value);
          break;
        case 'chandelier':
          result = this.calculateChandelierStopLoss(input, strategy.value, 22); // 通常22期間
          break;
        case 'parabolic_sar':
          result = this.calculateParabolicSARStopLoss(input, 0.02, 0.2);
          break;
      }

      if (result) {
        activeStrategies++;
        totalConfidence += result.confidence;

        if (result.shouldExit) {
          shouldExit = true;
          exitReasons.push(result.exitReason);
        }

        // LONGとSHORTでストップ価格の選択ロジックを変える
        if (input.positionSide === 'LONG') {
          // LONGの場合は最も高いストップ価格を選択（利益確定に近い価格）
          if (result.stopLossPrice > finalStopLossPrice) {
            finalStopLossPrice = result.stopLossPrice;
          }
        } else {
          // SHORTの場合は最も低いストップ価格を選択
          if (result.stopLossPrice < finalStopLossPrice) {
            finalStopLossPrice = result.stopLossPrice;
          }
        }
      }
    }

    const averageConfidence = activeStrategies > 0 ? totalConfidence / activeStrategies : 0;

    return {
      stopLossPrice: finalStopLossPrice,
      shouldExit,
      exitReason: exitReasons.length > 0 ? exitReasons.join('; ') : 'No active stop loss triggered',
      confidence: averageConfidence
    };
  }

  /**
   * 動的ストップロスレベルを調整
   */
  adjustStopLossDynamically(
    currentStopLoss: StopLossResult,
    input: AdvancedStopLossInput,
    marketVolatility: number,
    trendStrength: number
  ): StopLossResult {
    let adjustedStopLossPrice = currentStopLoss.stopLossPrice;
    const { positionSide } = input;

    // ボラティリティが高い場合はストップを広げる
    if (marketVolatility > 0.02) { // 2%以上の日ボラ
      const adjustment = marketVolatility * 0.5; // 50%のマージンを追加
      if (positionSide === 'LONG') {
        adjustedStopLossPrice = adjustedStopLossPrice - (adjustedStopLossPrice * adjustment);
      } else {
        adjustedStopLossPrice = adjustedStopLossPrice + (adjustedStopLossPrice * adjustment);
      }
    }

    // トレンドが強い場合はストップを引き締める
    if (Math.abs(trendStrength) > 0.5) { // 50%以上のトレンド強度
      const adjustment = Math.abs(trendStrength) * 0.3; // 30%引き締め
      if (positionSide === 'LONG') {
        adjustedStopLossPrice = adjustedStopLossPrice + (adjustedStopLossPrice * adjustment);
      } else {
        adjustedStopLossPrice = adjustedStopLossPrice - (adjustedStopLossPrice * adjustment);
      }
    }

    return {
      ...currentStopLoss,
      stopLossPrice: adjustedStopLossPrice
    };
  }
}

export const advancedStopLossService = new AdvancedStopLossService();