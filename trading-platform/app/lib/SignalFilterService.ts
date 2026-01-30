/**
 * SignalFilterService.ts
 * シグナルフィルタリングサービス
 * 複数のフィルタ条件を組み合わせてシグナルの信頼性を向上させる
 */

import { OHLCV, Signal } from '../types';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { advancedTechnicalIndicators, StochasticResult, ADXResult, WilliamsRResult } from './AdvancedTechnicalIndicators';
import {
    RSI_CONFIG,
    SIGNAL_THRESHOLDS,
    VOLATILITY,
} from './constants';

export interface FilterResult {
    passed: boolean;
    confidence: number;
    reasons: string[];
    filteredReason?: string;
}

export interface SignalFilterConfig {
    enableVolumeFilter: boolean;
    enableTrendFilter: boolean;
    enableADXFilter: boolean;
    enableStochasticFilter: boolean;
    enableWilliamsRFilter: boolean;
    minVolumeMultiplier: number;
    minADX: number;
    stochasticPeriod: number;
    williamsRPeriod: number;
}

export const DEFAULT_SIGNAL_FILTER_CONFIG: SignalFilterConfig = {
    enableVolumeFilter: true,
    enableTrendFilter: true,
    enableADXFilter: true,
    enableStochasticFilter: true,
    enableWilliamsRFilter: true,
    minVolumeMultiplier: 1.2,
    minADX: 25,
    stochasticPeriod: 14,
    williamsRPeriod: 14,
};

class SignalFilterService {
    /**
     * シグナルをフィルタリング
     * @param signal - 元のシグナル
     * @param data - OHLCVデータ
     * @param config - フィルタ設定
     * @returns フィルタリング結果
     */
    filterSignal(
        signal: Signal,
        data: OHLCV[],
        config: SignalFilterConfig = DEFAULT_SIGNAL_FILTER_CONFIG
    ): FilterResult {
        const reasons: string[] = [];
        let confidence = signal.confidence;
        let passed = true;

        if (data.length < 50) {
            return {
                passed: false,
                confidence: 0,
                reasons: ['データ不足'],
                filteredReason: 'データが不足しています（最低50日分必要）',
            };
        }

        const currentIndex = data.length - 1;
        const closes = data.map(d => d.close);

        // 1. ボリュームフィルタ
        if (config.enableVolumeFilter) {
            const volumeResult = this.checkVolume(data, currentIndex, config.minVolumeMultiplier);
            if (!volumeResult.passed) {
                passed = false;
                reasons.push(volumeResult.reason);
            } else {
                confidence += volumeResult.confidenceBonus;
                reasons.push(volumeResult.reason);
            }
        }

        // 2. トレンドフィルタ（SMA）
        if (config.enableTrendFilter) {
            const trendResult = this.checkTrend(data, currentIndex, signal.type);
            if (!trendResult.passed) {
                passed = false;
                reasons.push(trendResult.reason);
            } else {
                confidence += trendResult.confidenceBonus;
                reasons.push(trendResult.reason);
            }
        }

        // 3. ADXフィルタ（トレンド強度）
        if (config.enableADXFilter) {
            const adxResult = this.checkADX(data, currentIndex, config.minADX, signal.type);
            if (!adxResult.passed) {
                passed = false;
                reasons.push(adxResult.reason);
            } else {
                confidence += adxResult.confidenceBonus;
                reasons.push(adxResult.reason);
            }
        }

        // 4. Stochasticフィルタ
        if (config.enableStochasticFilter) {
            const stochasticResult = this.checkStochastic(data, currentIndex, config.stochasticPeriod, signal.type);
            if (!stochasticResult.passed) {
                passed = false;
                reasons.push(stochasticResult.reason);
            } else {
                confidence += stochasticResult.confidenceBonus;
                reasons.push(stochasticResult.reason);
            }
        }

        // 5. Williams %Rフィルタ
        if (config.enableWilliamsRFilter) {
            const williamsRResult = this.checkWilliamsR(data, currentIndex, config.williamsRPeriod, signal.type);
            if (!williamsRResult.passed) {
                passed = false;
                reasons.push(williamsRResult.reason);
            } else {
                confidence += williamsRResult.confidenceBonus;
                reasons.push(williamsRResult.reason);
            }
        }

        // 信頼度の調整（最大100、最小0）
        confidence = Math.max(0, Math.min(100, confidence));

        return {
            passed,
            confidence,
            reasons,
            filteredReason: passed ? undefined : `フィルタ条件を満たしません: ${reasons.join(', ')}`,
        };
    }

    /**
     * ボリュームチェック
     * 平均ボリュームのminVolumeMultiplier倍以上であることを確認
     */
    private checkVolume(
        data: OHLCV[],
        index: number,
        minMultiplier: number
    ): { passed: boolean; reason: string; confidenceBonus: number } {
        const avgVolume = data.slice(0, index).reduce((sum, d) => sum + d.volume, 0) / index;
        const currentVolume = data[index].volume;

        if (currentVolume >= avgVolume * minMultiplier) {
            return {
                passed: true,
                reason: `ボリューム確認: ${currentVolume.toFixed(0)} (平均の${(currentVolume / avgVolume).toFixed(1)}倍)`,
                confidenceBonus: 5,
            };
        }

        return {
            passed: false,
            reason: `ボリューム不足: ${currentVolume.toFixed(0)} (平均の${(currentVolume / avgVolume).toFixed(1)}倍、必要${minMultiplier}倍以上)`,
            confidenceBonus: 0,
        };
    }

    /**
     * トレンドチェック（SMAベース）
     * シグナルタイプとトレンド方向が一致していることを確認
     */
    private checkTrend(
        data: OHLCV[],
        index: number,
        signalType: 'BUY' | 'SELL' | 'HOLD'
    ): { passed: boolean; reason: string; confidenceBonus: number } {
        const closes = data.map(d => d.close);
        const sma20 = technicalIndicatorService.calculateSMA(closes, 20);
        const sma50 = technicalIndicatorService.calculateSMA(closes, 50);

        const currentPrice = data[index].close;
        const currentSMA20 = sma20[index];
        const currentSMA50 = sma50[index];

        if (isNaN(currentSMA20) || isNaN(currentSMA50)) {
            return {
                passed: false,
                reason: 'SMA計算不可',
                confidenceBonus: 0,
            };
        }

        // 買いシグナル: 価格がSMA20以上、かつSMA20がSMA50以上
        if (signalType === 'BUY') {
            if (currentPrice >= currentSMA20 && currentSMA20 >= currentSMA50) {
                return {
                    passed: true,
                    reason: `トレンド確認: 価格(${currentPrice.toFixed(0)}) >= SMA20(${currentSMA20.toFixed(0)}) >= SMA50(${currentSMA50.toFixed(0)})`,
                    confidenceBonus: 8,
                };
            }
            return {
                passed: false,
                reason: `トレンド不一致: 価格(${currentPrice.toFixed(0)}) < SMA20(${currentSMA20.toFixed(0)}) または SMA20 < SMA50(${currentSMA50.toFixed(0)})`,
                confidenceBonus: 0,
            };
        }

        // 売りシグナル: 価格がSMA20以下、かつSMA20がSMA50以下
        if (signalType === 'SELL') {
            if (currentPrice <= currentSMA20 && currentSMA20 <= currentSMA50) {
                return {
                    passed: true,
                    reason: `トレンド確認: 価格(${currentPrice.toFixed(0)}) <= SMA20(${currentSMA20.toFixed(0)}) <= SMA50(${currentSMA50.toFixed(0)})`,
                    confidenceBonus: 8,
                };
            }
            return {
                passed: false,
                reason: `トレンド不一致: 価格(${currentPrice.toFixed(0)}) > SMA20(${currentSMA20.toFixed(0)}) または SMA20 > SMA50(${currentSMA50.toFixed(0)})`,
                confidenceBonus: 0,
            };
        }

        return {
            passed: true,
            reason: 'HOLDシグナル - トレンドチェックなし',
            confidenceBonus: 0,
        };
    }

    /**
     * ADXチェック（トレンド強度）
     * トレンドが十分に強いことを確認
     */
    private checkADX(
        data: OHLCV[],
        index: number,
        minADX: number,
        signalType: 'BUY' | 'SELL' | 'HOLD'
    ): { passed: boolean; reason: string; confidenceBonus: number } {
        const adxResult = advancedTechnicalIndicators.calculateADX(data, 14);
        const { adx, plusDI, minusDI } = adxResult;

        if (index >= adx.length || isNaN(adx[index]) || isNaN(plusDI[index]) || isNaN(minusDI[index])) {
            return {
                passed: false,
                reason: 'ADX計算不可',
                confidenceBonus: 0,
            };
        }

        const currentADX = adx[index];
        const currentPlusDI = plusDI[index];
        const currentMinusDI = minusDI[index];

        // ADXが最小値を下回る場合はフィルタ
        if (currentADX < minADX) {
            return {
                passed: false,
                reason: `トレンド弱い: ADX(${currentADX.toFixed(1)}) < 最小値(${minADX})`,
                confidenceBonus: 0,
            };
        }

        // 買いシグナル: +DI > -DI
        if (signalType === 'BUY') {
            if (currentPlusDI > currentMinusDI) {
                return {
                    passed: true,
                    reason: `ADXトレンド確認: ADX(${currentADX.toFixed(1)}), +DI(${currentPlusDI.toFixed(1)}) > -DI(${currentMinusDI.toFixed(1)})`,
                    confidenceBonus: 6,
                };
            }
            return {
                passed: false,
                reason: `ADXトレンド不一致: +DI(${currentPlusDI.toFixed(1)}) <= -DI(${currentMinusDI.toFixed(1)})`,
                confidenceBonus: 0,
            };
        }

        // 売りシグナル: -DI > +DI
        if (signalType === 'SELL') {
            if (currentMinusDI > currentPlusDI) {
                return {
                    passed: true,
                    reason: `ADXトレンド確認: ADX(${currentADX.toFixed(1)}), -DI(${currentMinusDI.toFixed(1)}) > +DI(${currentPlusDI.toFixed(1)})`,
                    confidenceBonus: 6,
                };
            }
            return {
                passed: false,
                reason: `ADXトレンド不一致: -DI(${currentMinusDI.toFixed(1)}) <= +DI(${currentPlusDI.toFixed(1)})`,
                confidenceBonus: 0,
            };
        }

        return {
            passed: true,
            reason: 'HOLDシグナル - ADXチェックなし',
            confidenceBonus: 0,
        };
    }

    /**
     * Stochasticチェック
     * オシレーターが売られすぎ/買われすぎ領域でクロスしていることを確認
     */
    private checkStochastic(
        data: OHLCV[],
        index: number,
        period: number,
        signalType: 'BUY' | 'SELL' | 'HOLD'
    ): { passed: boolean; reason: string; confidenceBonus: number } {
        const stochastic = advancedTechnicalIndicators.calculateStochastic(data, period, 3);
        const { k, d } = stochastic;

        if (index >= k.length || isNaN(k[index]) || isNaN(d[index]) || index < 1) {
            return {
                passed: false,
                reason: 'Stochastic計算不可',
                confidenceBonus: 0,
            };
        }

        const stochasticSignal = advancedTechnicalIndicators.getStochasticSignal(k, d, index);

        // 買いシグナル: Stochasticも買いシグナル
        if (signalType === 'BUY') {
            if (stochasticSignal === 'BUY') {
                return {
                    passed: true,
                    reason: `Stochastic確認: %K(${k[index].toFixed(1)}) が %D(${d[index].toFixed(1)})をゴールデンクロス（売られすぎ領域）`,
                    confidenceBonus: 5,
                };
            }
            return {
                passed: false,
                reason: `Stochastic不一致: %K(${k[index].toFixed(1)}) と %D(${d[index].toFixed(1)})が買いシグナルを示していない`,
                confidenceBonus: 0,
            };
        }

        // 売りシグナル: Stochasticも売りシグナル
        if (signalType === 'SELL') {
            if (stochasticSignal === 'SELL') {
                return {
                    passed: true,
                    reason: `Stochastic確認: %K(${k[index].toFixed(1)}) が %D(${d[index].toFixed(1)})をデッドクロス（買われすぎ領域）`,
                    confidenceBonus: 5,
                };
            }
            return {
                passed: false,
                reason: `Stochastic不一致: %K(${k[index].toFixed(1)}) と %D(${d[index].toFixed(1)})が売りシグナルを示していない`,
                confidenceBonus: 0,
            };
        }

        return {
            passed: true,
            reason: 'HOLDシグナル - Stochasticチェックなし',
            confidenceBonus: 0,
        };
    }

    /**
     * Williams %Rチェック
     * オシレーターが売られすぎ/買われすぎ領域にあることを確認
     */
    private checkWilliamsR(
        data: OHLCV[],
        index: number,
        period: number,
        signalType: 'BUY' | 'SELL' | 'HOLD'
    ): { passed: boolean; reason: string; confidenceBonus: number } {
        const williamsRResult = advancedTechnicalIndicators.calculateWilliamsR(data, period);
        const { williamsR } = williamsRResult;

        if (index >= williamsR.length || isNaN(williamsR[index])) {
            return {
                passed: false,
                reason: 'Williams %R計算不可',
                confidenceBonus: 0,
            };
        }

        const currentR = williamsR[index];
        const williamsRSignal = advancedTechnicalIndicators.getWilliamsRSignal(williamsR, index);

        // 買いシグナル: Williams %Rも買いシグナル
        if (signalType === 'BUY') {
            if (williamsRSignal === 'BUY') {
                return {
                    passed: true,
                    reason: `Williams %R確認: ${currentR.toFixed(1)}（売られすぎ領域）`,
                    confidenceBonus: 4,
                };
            }
            return {
                passed: false,
                reason: `Williams %R不一致: ${currentR.toFixed(1)}（売られすぎ領域ではない）`,
                confidenceBonus: 0,
            };
        }

        // 売りシグナル: Williams %Rも売りシグナル
        if (signalType === 'SELL') {
            if (williamsRSignal === 'SELL') {
                return {
                    passed: true,
                    reason: `Williams %R確認: ${currentR.toFixed(1)}（買われすぎ領域）`,
                    confidenceBonus: 4,
                };
            }
            return {
                passed: false,
                reason: `Williams %R不一致: ${currentR.toFixed(1)}（買われすぎ領域ではない）`,
                confidenceBonus: 0,
            };
        }

        return {
            passed: true,
            reason: 'HOLDシグナル - Williams %Rチェックなし',
            confidenceBonus: 0,
        };
    }
}

export const signalFilterService = new SignalFilterService();
