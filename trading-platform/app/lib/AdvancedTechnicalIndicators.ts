/**
 * AdvancedTechnicalIndicators.ts
 * 高度なテクニカル指標の計算サービス
 * Stochastic Oscillator, ADX, Williams %R などを提供
 */

import { OHLCV } from '../types';

export interface StochasticResult {
    k: number[];
    d: number[];
}

export interface ADXResult {
    adx: number[];
    plusDI: number[];
    minusDI: number[];
}

export interface WilliamsRResult {
    williamsR: number[];
}

class AdvancedTechnicalIndicators {
    /**
     * Stochastic Oscillator（ストキャスティクス・オシレーター）
     * @param data - OHLCVデータ
     * @param kPeriod - %K期間（デフォルト14）
     * @param dPeriod - %D期間（デフォルト3）
     * @returns StochasticResult
     */
    calculateStochastic(data: OHLCV[], kPeriod: number = 14, dPeriod: number = 3): StochasticResult {
        const k: number[] = [];
        const d: number[] = [];

        for (let i = 0; i < data.length; i++) {
            if (i < kPeriod - 1) {
                k.push(NaN);
                continue;
            }

            // 過去k期間の最高値と最安値を取得
            const slice = data.slice(i - kPeriod + 1, i + 1);
            const highHigh = Math.max(...slice.map(d => d.high));
            const lowLow = Math.min(...slice.map(d => d.low));

            // %Kの計算
            const currentClose = data[i].close;
            const range = highHigh - lowLow;
            const kValue = range > 0 ? ((currentClose - lowLow) / range) * 100 : 50;
            k.push(kValue);
        }

        // %Dの計算（%Kの移動平均）
        for (let i = 0; i < k.length; i++) {
            if (i < dPeriod - 1) {
                d.push(NaN);
                continue;
            }

            const sum = k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
            d.push(sum / dPeriod);
        }

        return { k, d };
    }

    /**
     * ADX（Average Directional Index）
     * トレンドの強さを測定する指標
     * @param data - OHLCVデータ
     * @param period - ADX期間（デフォルト14）
     * @returns ADXResult
     */
    calculateADX(data: OHLCV[], period: number = 14): ADXResult {
        const adx: number[] = [];
        const plusDI: number[] = [];
        const minusDI: number[] = [];

        if (data.length < period * 2) {
            return { adx: [], plusDI: [], minusDI: [] };
        }

        // True Range, +DM, -DMの計算
        const tr: number[] = [];
        const plusDM: number[] = [];
        const minusDM: number[] = [];

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                tr.push(data[i].high - data[i].low);
                plusDM.push(0);
                minusDM.push(0);
            } else {
                const high = data[i].high;
                const low = data[i].low;
                const prevHigh = data[i - 1].high;
                const prevLow = data[i - 1].low;
                const prevClose = data[i - 1].close;

                const trValue = Math.max(
                    high - low,
                    Math.abs(high - prevClose),
                    Math.abs(low - prevClose)
                );
                tr.push(trValue);

                const upMove = high - prevHigh;
                const downMove = prevLow - low;

                plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
                minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
            }
        }

        // 平滑化されたTR, +DM, -DMの計算
        const smoothedTR: number[] = [];
        const smoothedPlusDM: number[] = [];
        const smoothedMinusDM: number[] = [];

        for (let i = 0; i < tr.length; i++) {
            if (i < period) {
                smoothedTR.push(NaN);
                smoothedPlusDM.push(NaN);
                smoothedMinusDM.push(NaN);
            } else if (i === period) {
                const sumTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
                const sumPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
                const sumMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
                smoothedTR.push(sumTR);
                smoothedPlusDM.push(sumPlusDM);
                smoothedMinusDM.push(sumMinusDM);
            } else {
                smoothedTR.push(smoothedTR[i - 1] - (smoothedTR[i - 1] / period) + tr[i]);
                smoothedPlusDM.push(smoothedPlusDM[i - 1] - (smoothedPlusDM[i - 1] / period) + plusDM[i]);
                smoothedMinusDM.push(smoothedMinusDM[i - 1] - (smoothedMinusDM[i - 1] / period) + minusDM[i]);
            }
        }

        // +DI, -DIの計算
        for (let i = 0; i < smoothedTR.length; i++) {
            if (isNaN(smoothedTR[i]) || smoothedTR[i] === 0) {
                plusDI.push(NaN);
                minusDI.push(NaN);
            } else {
                plusDI.push((smoothedPlusDM[i] / smoothedTR[i]) * 100);
                minusDI.push((smoothedMinusDM[i] / smoothedTR[i]) * 100);
            }
        }

        // DXの計算
        const dx: number[] = [];
        for (let i = 0; i < plusDI.length; i++) {
            if (isNaN(plusDI[i]) || isNaN(minusDI[i])) {
                dx.push(NaN);
            } else {
                const diDiff = Math.abs(plusDI[i] - minusDI[i]);
                const diSum = plusDI[i] + minusDI[i];
                dx.push((diDiff / (diSum || 0.0001)) * 100);
            }
        }

        // ADXの計算（DXの移動平均）
        for (let i = 0; i < dx.length; i++) {
            if (i < period * 2 - 1) {
                adx.push(NaN);
            } else if (i === period * 2 - 1) {
                const sum = dx.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                adx.push(sum / period);
            } else {
                adx.push((adx[i - 1] * (period - 1) + dx[i]) / period);
            }
        }

        return { adx, plusDI, minusDI };
    }

    /**
     * Williams %R（ウィリアムズ%R）
     * @param data - OHLCVデータ
     * @param period - 期間（デフォルト14）
     * @returns Williams %Rの配列
     */
    calculateWilliamsR(data: OHLCV[], period: number = 14): WilliamsRResult {
        const williamsR: number[] = [];

        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                williamsR.push(NaN);
                continue;
            }

            // 過去period期間の最高値と最安値を取得
            const slice = data.slice(i - period + 1, i + 1);
            const highHigh = Math.max(...slice.map(d => d.high));
            const lowLow = Math.min(...slice.map(d => d.low));

            // Williams %Rの計算
            const currentClose = data[i].close;
            const rValue = ((highHigh - currentClose) / (highHigh - lowLow || 0.0001)) * -100;
            williamsR.push(rValue);
        }

        return { williamsR };
    }

    /**
     * Stochastic Oscillatorのシグナル判定
     * @param k - %K値
     * @param d - %D値
     * @param index - インデックス
     * @returns シグナルタイプ
     */
    getStochasticSignal(k: number[], d: number[], index: number): 'BUY' | 'SELL' | 'NEUTRAL' {
        if (index < 1 || isNaN(k[index]) || isNaN(d[index])) {
            return 'NEUTRAL';
        }

        const currentK = k[index];
        const currentD = d[index];
        const prevK = k[index - 1];
        const prevD = d[index - 1];

        // 買いシグナル: %Kが%Dを下から上にクロス、かつ両方が売られすぎ領域
        if (prevK <= prevD && currentK > currentD && currentK < 20 && currentD < 20) {
            return 'BUY';
        }

        // 売りシグナル: %Kが%Dを上から下にクロス、かつ両方が買われすぎ領域
        if (prevK >= prevD && currentK < currentD && currentK > 80 && currentD > 80) {
            return 'SELL';
        }

        return 'NEUTRAL';
    }

    /**
     * ADXに基づくトレンド強度判定
     * @param adx - ADX値
     * @param plusDI - +DI値
     * @param minusDI - -DI値
     * @param index - インデックス
     * @returns トレンド情報
     */
    getADXTrendInfo(adx: number[], plusDI: number[], minusDI: number[], index: number): {
        strength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
        direction: 'UP' | 'DOWN' | 'NEUTRAL';
    } {
        if (index >= adx.length || isNaN(adx[index]) || isNaN(plusDI[index]) || isNaN(minusDI[index])) {
            return { strength: 'NONE', direction: 'NEUTRAL' };
        }

        const currentADX = adx[index];
        const currentPlusDI = plusDI[index];
        const currentMinusDI = minusDI[index];

        // トレンド強度の判定
        let strength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
        if (currentADX > 40) {
            strength = 'STRONG';
        } else if (currentADX > 25) {
            strength = 'MODERATE';
        } else if (currentADX > 20) {
            strength = 'WEAK';
        } else {
            strength = 'NONE';
        }

        // トレンド方向の判定
        let direction: 'UP' | 'DOWN' | 'NEUTRAL';
        if (currentPlusDI > currentMinusDI && strength !== 'NONE') {
            direction = 'UP';
        } else if (currentMinusDI > currentPlusDI && strength !== 'NONE') {
            direction = 'DOWN';
        } else {
            direction = 'NEUTRAL';
        }

        return { strength, direction };
    }

    /**
     * Williams %Rのシグナル判定
     * @param williamsR - Williams %R値
     * @param index - インデックス
     * @returns シグナルタイプ
     */
    getWilliamsRSignal(williamsR: number[], index: number): 'BUY' | 'SELL' | 'NEUTRAL' {
        if (index >= williamsR.length || isNaN(williamsR[index])) {
            return 'NEUTRAL';
        }

        const currentR = williamsR[index];

        // 買いシグナル: -80以下（売られすぎ）
        if (currentR <= -80) {
            return 'BUY';
        }

        // 売りシグナル: -20以上（買われすぎ）
        if (currentR >= -20) {
            return 'SELL';
        }

        return 'NEUTRAL';
    }
}

export const advancedTechnicalIndicators = new AdvancedTechnicalIndicators();
