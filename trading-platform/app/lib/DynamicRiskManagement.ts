/**
 * DynamicRiskManagement.ts
 * 動的リスク管理サービス
 * ボラティリティに応じた動的なストップロス調整、トレイリングストップの実装
 */

import { OHLCV, Position, RiskManagementSettings, RiskCalculationResult } from '../types';
import { RISK_MANAGEMENT, VOLATILITY } from './constants';
import { calculateATR, getLatestATR } from './riskManagement';

export interface TrailingStopState {
    enabled: boolean;
    highestHigh: number;       // ロング用の最高値
    lowestLow: number;         // ショート用の最安値
    currentStop: number;       // 現在のストップロス価格
    lastUpdateDate: string;    // 最終更新日
}

export interface DynamicRiskCalculationResult extends RiskCalculationResult {
    trailingStopState?: TrailingStopState;
    volatilityAdjustedStopLoss: number;
    volatilityAdjustedTakeProfit: number;
    positionSizingMethod: string;
    riskRewardRatio: number;
}

export interface DynamicRiskConfig {
    enableTrailingStop: boolean;
    trailingStopATRMultiple: number;
    trailingStopMinPercent: number;
    enableVolatilityAdjustment: boolean;
    volatilityMultiplier: number;
    enableDynamicPositionSizing: boolean;
    maxRiskPerTrade: number;
    minRiskRewardRatio: number;
}

export const DEFAULT_DYNAMIC_RISK_CONFIG: DynamicRiskConfig = {
    enableTrailingStop: true,
    trailingStopATRMultiple: 2.0,
    trailingStopMinPercent: 1.0,
    enableVolatilityAdjustment: true,
    volatilityMultiplier: 1.5,
    enableDynamicPositionSizing: true,
    maxRiskPerTrade: 2.0,  // 資本の2%
    minRiskRewardRatio: 2.0,  // 最低1:2
};

class DynamicRiskManagement {
    private trailingStopStates: Map<string, TrailingStopState> = new Map();

    /**
     * 動的リスク計算
     * ボラティリティに応じてストップロスと利確を調整
     */
    calculateDynamicRisk(
        capital: number,
        entryPrice: number,
        side: 'LONG' | 'SHORT',
        data: OHLCV[],
        settings: RiskManagementSettings,
        config: DynamicRiskConfig = DEFAULT_DYNAMIC_RISK_CONFIG
    ): DynamicRiskCalculationResult {
        // ATRの計算
        const atr = getLatestATR(data, VOLATILITY.DEFAULT_ATR_PERIOD) || 0;
        const atrPercent = atr / entryPrice;

        // ボラティリティに応じたストップロス調整
        let volatilityAdjustedStopLoss: number;
        let volatilityAdjustedTakeProfit: number;

        if (config.enableVolatilityAdjustment && atr > 0) {
            // ボラティリティが高い場合はストップロスを広げる
            const volatilityFactor = Math.min(Math.max(atrPercent * config.volatilityMultiplier, 0.01), 0.05);
            
            if (side === 'LONG') {
                volatilityAdjustedStopLoss = entryPrice * (1 - volatilityFactor);
                volatilityAdjustedTakeProfit = entryPrice * (1 + volatilityFactor * config.minRiskRewardRatio);
            } else {
                volatilityAdjustedStopLoss = entryPrice * (1 + volatilityFactor);
                volatilityAdjustedTakeProfit = entryPrice * (1 - volatilityFactor * config.minRiskRewardRatio);
            }
        } else {
            // デフォルト設定を使用
            const defaultStopPercent = RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PERCENT / 100;
            const defaultTakeProfitPercent = RISK_MANAGEMENT.DEFAULT_TAKE_PROFIT_PERCENT / 100;
            
            if (side === 'LONG') {
                volatilityAdjustedStopLoss = entryPrice * (1 - defaultStopPercent);
                volatilityAdjustedTakeProfit = entryPrice * (1 + defaultTakeProfitPercent);
            } else {
                volatilityAdjustedStopLoss = entryPrice * (1 + defaultStopPercent);
                volatilityAdjustedTakeProfit = entryPrice * (1 - defaultTakeProfitPercent);
            }
        }

        // リスクリワード比の計算
        const riskAmount = Math.abs(entryPrice - volatilityAdjustedStopLoss);
        const rewardAmount = Math.abs(volatilityAdjustedTakeProfit - entryPrice);
        const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;

        // 動的ポジションサイジング
        let positionSize: number;
        let positionSizingMethod: string;

        if (config.enableDynamicPositionSizing) {
            // ケリーフォーミュラを簡略化して使用
            // 期待勝率を50%と仮定
            const winRate = 0.5;
            const avgWin = rewardAmount / entryPrice;
            const avgLoss = riskAmount / entryPrice;
            
            // ケリーフォーミュラ: f = (bp - q) / b
            // b = avgWin / avgLoss, p = winRate, q = 1 - winRate
            const b = avgLoss > 0 ? avgWin / avgLoss : 1;
            const kellyFraction = (winRate * b - (1 - winRate)) / b;
            const adjustedKelly = Math.max(0, Math.min(kellyFraction, 0.25)); // 最大25%
            
            // 資本の最大リスク率を適用
            const maxRiskPercent = config.maxRiskPerTrade / 100;
            const riskPercent = Math.min(adjustedKelly, maxRiskPercent);
            
            positionSize = Math.floor((capital * riskPercent) / entryPrice);
            positionSizingMethod = `ケリー基準（調整済: ${(riskPercent * 100).toFixed(1)}%）`;
        } else {
            // 固定比率法
            const ratio = settings.fixedRatio ?? 0.1;
            positionSize = Math.floor((capital * ratio) / entryPrice);
            positionSizingMethod = `固定比率（${(ratio * 100).toFixed(0)}%）`;
        }

        // 最小サイズ制限
        const minSize = 100;
        positionSize = Math.max(minSize, positionSize);

        // 最大サイズ制限
        const maxPositionPercent = settings.maxPositionPercent ?? RISK_MANAGEMENT.MAX_POSITION_PERCENT;
        const maxPositionValue = capital * (maxPositionPercent / 100);
        const maxPositionSize = Math.floor(maxPositionValue / entryPrice);
        positionSize = Math.min(positionSize, maxPositionSize);

        // リスク額とパーセンテージの計算
        const totalRisk = positionSize * riskAmount;
        const riskPercentOfCapital = (totalRisk / capital) * 100;
        const positionRiskPercent = riskAmount / entryPrice * 100;

        return {
            positionSize,
            stopLossPrice: volatilityAdjustedStopLoss,
            takeProfitPrice: volatilityAdjustedTakeProfit,
            riskAmount,
            riskPercent: riskPercentOfCapital,
            positionRiskPercent: positionRiskPercent,
            maxPositionSize: maxPositionSize,
            volatilityAdjustedStopLoss,
            volatilityAdjustedTakeProfit,
            positionSizingMethod,
            riskRewardRatio,
        };
    }

    /**
     * トレイリングストップの更新
     * ポジションの利益に応じてストップロスを引き上げる
     */
    updateTrailingStop(
        symbol: string,
        side: 'LONG' | 'SHORT',
        currentPrice: number,
        entryPrice: number,
        atr: number,
        config: DynamicRiskConfig = DEFAULT_DYNAMIC_RISK_CONFIG
    ): TrailingStopState {
        const currentState = this.trailingStopStates.get(symbol);
        const now = new Date().toISOString().split('T')[0];

        // 初期状態の作成
        if (!currentState) {
            const initialStop = this.calculateInitialTrailingStop(side, entryPrice, atr, config);
            const newState: TrailingStopState = {
                enabled: config.enableTrailingStop,
                highestHigh: side === 'LONG' ? currentPrice : 0,
                lowestLow: side === 'SHORT' ? currentPrice : Infinity,
                currentStop: initialStop,
                lastUpdateDate: now,
            };
            this.trailingStopStates.set(symbol, newState);
            return newState;
        }

        // トレイリングストップが有効でない場合は更新しない
        if (!currentState.enabled || !config.enableTrailingStop) {
            return currentState;
        }

        // 最高値/最安値の更新
        let newState = { ...currentState };
        
        if (side === 'LONG') {
            newState.highestHigh = Math.max(currentState.highestHigh, currentPrice);
            
            // 利益が出ている場合のみストップを引き上げる
            if (currentPrice > entryPrice) {
                const atrBasedStop = newState.highestHigh - (atr * config.trailingStopATRMultiple);
                const minStop = entryPrice * (1 - config.trailingStopMinPercent / 100);
                newState.currentStop = Math.max(atrBasedStop, minStop);
            }
        } else {
            newState.lowestLow = Math.min(currentState.lowestLow, currentPrice);
            
            // 利益が出ている場合のみストップを引き下げる
            if (currentPrice < entryPrice) {
                const atrBasedStop = newState.lowestLow + (atr * config.trailingStopATRMultiple);
                const maxStop = entryPrice * (1 + config.trailingStopMinPercent / 100);
                newState.currentStop = Math.min(atrBasedStop, maxStop);
            }
        }

        newState.lastUpdateDate = now;
        this.trailingStopStates.set(symbol, newState);
        return newState;
    }

    /**
     * 初期トレイリングストップ価格の計算
     */
    private calculateInitialTrailingStop(
        side: 'LONG' | 'SHORT',
        entryPrice: number,
        atr: number,
        config: DynamicRiskConfig
    ): number {
        if (atr <= 0) {
            // ATRが計算できない場合はデフォルト値を使用
            const defaultPercent = RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PERCENT / 100;
            return side === 'LONG'
                ? entryPrice * (1 - defaultPercent)
                : entryPrice * (1 + defaultPercent);
        }

        const atrStop = atr * config.trailingStopATRMultiple;
        const minStop = entryPrice * (config.trailingStopMinPercent / 100);

        if (side === 'LONG') {
            return Math.max(entryPrice - atrStop, entryPrice - minStop);
        } else {
            return Math.min(entryPrice + atrStop, entryPrice + minStop);
        }
    }

    /**
     * トレイリングストップの状態を取得
     */
    getTrailingStopState(symbol: string): TrailingStopState | undefined {
        return this.trailingStopStates.get(symbol);
    }

    /**
     * トレイリングストップの状態をクリア（ポジション決済時）
     */
    clearTrailingStopState(symbol: string): void {
        this.trailingStopStates.delete(symbol);
    }

    /**
     * 全てのトレイリングストップ状態をクリア
     */
    clearAllTrailingStopStates(): void {
        this.trailingStopStates.clear();
    }

    /**
     * ストップロスに達したかチェック
     */
    checkStopLoss(
        symbol: string,
        side: 'LONG' | 'SHORT',
        currentPrice: number,
        entryPrice: number,
        atr: number,
        config: DynamicRiskConfig = DEFAULT_DYNAMIC_RISK_CONFIG
    ): { triggered: boolean; stopPrice: number; reason: string } {
        const trailingState = this.trailingStopStates.get(symbol);
        const stopPrice = trailingState?.currentStop || this.calculateInitialTrailingStop(side, entryPrice, atr, config);

        if (side === 'LONG') {
            if (currentPrice <= stopPrice) {
                return {
                    triggered: true,
                    stopPrice,
                    reason: trailingState?.enabled ? 'トレイリングストップ' : 'ストップロス',
                };
            }
        } else {
            if (currentPrice >= stopPrice) {
                return {
                    triggered: true,
                    stopPrice,
                    reason: trailingState?.enabled ? 'トレイリングストップ' : 'ストップロス',
                };
            }
        }

        return {
            triggered: false,
            stopPrice,
            reason: '未トリガー',
        };
    }

    /**
     * 利確価格に達したかチェック
     */
    checkTakeProfit(
        side: 'LONG' | 'SHORT',
        currentPrice: number,
        takeProfitPrice: number
    ): { triggered: boolean; reason: string } {
        if (side === 'LONG') {
            if (currentPrice >= takeProfitPrice) {
                return {
                    triggered: true,
                    reason: '利確',
                };
            }
        } else {
            if (currentPrice <= takeProfitPrice) {
                return {
                    triggered: true,
                    reason: '利確',
                };
            }
        }

        return {
            triggered: false,
            reason: '未トリガー',
        };
    }

    /**
     * ボラティリティに基づくリスクレベルの判定
     */
    getVolatilityRiskLevel(data: OHLCV[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
        const atr = getLatestATR(data, VOLATILITY.DEFAULT_ATR_PERIOD);
        if (!atr || data.length === 0) {
            return 'MEDIUM';
        }

        const currentPrice = data[data.length - 1].close;
        const atrPercent = (atr / currentPrice) * 100;

        if (atrPercent < 1.0) {
            return 'LOW';
        } else if (atrPercent < 2.0) {
            return 'MEDIUM';
        } else if (atrPercent < 4.0) {
            return 'HIGH';
        } else {
            return 'EXTREME';
        }
    }

    /**
     * ボラティリティに応じたポジションサイズの調整係数を計算
     */
    getVolatilityAdjustmentFactor(data: OHLCV[]): number {
        const riskLevel = this.getVolatilityRiskLevel(data);
        
        switch (riskLevel) {
            case 'LOW':
                return 1.2;  // 低ボラティリティ: ポジションサイズを増やす
            case 'MEDIUM':
                return 1.0;  // 中ボラティリティ: 標準
            case 'HIGH':
                return 0.7;  // 高ボラティリティ: ポジションサイズを減らす
            case 'EXTREME':
                return 0.5;  // 極端ボラティリティ: ポジションサイズを大幅に減らす
            default:
                return 1.0;
        }
    }
}

export const dynamicRiskManagement = new DynamicRiskManagement();
