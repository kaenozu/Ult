import { OHLCV } from '../types/shared';
import * as ta from './utils/technical-analysis';
import { TECHNICAL_INDICATORS } from './constants';

/**
 * テクニカル指標計算サービス
 * 
 * 株式取引で使用される主要なテクニカル指標を計算するサービスクラス。
 * 共通ライブラリ(technical-analysis.ts)を使用し、システム全体で計算ロジックを統一している。
 */
class TechnicalIndicatorService {
    calculateSMA(prices: number[], period: number): number[] {
        return ta.calculateSMA(prices, period);
    }

    calculateEMA(prices: number[], period: number): number[] {
        return ta.calculateEMA(prices, period);
    }

    calculateRSI(prices: number[], period: number = TECHNICAL_INDICATORS.RSI_PERIOD): number[] {
        return ta.calculateRSI(prices, period);
    }

    calculateMACD(
        prices: number[],
        fastPeriod: number = TECHNICAL_INDICATORS.MACD_FAST,
        slowPeriod: number = TECHNICAL_INDICATORS.MACD_SLOW,
        signalPeriod: number = TECHNICAL_INDICATORS.MACD_SIGNAL
    ): { macd: number[]; signal: number[]; histogram: number[] } {
        return ta.calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
    }

    calculateBollingerBands(
        prices: number[],
        period: number = TECHNICAL_INDICATORS.BB_PERIOD,
        stdDev: number = TECHNICAL_INDICATORS.BB_STD_DEV
    ): { upper: number[]; middle: number[]; lower: number[] } {
        return ta.calculateBollingerBands(prices, period, stdDev);
    }

    calculateATR(ohlcv: OHLCV[], period: number = TECHNICAL_INDICATORS.ATR_PERIOD): number[] {
        return ta.calculateATR(ohlcv, period);
    }

    calculateADX(ohlcv: OHLCV[], period: number = TECHNICAL_INDICATORS.ADX_PERIOD): number[] {
        return ta.calculateADX(ohlcv, period);
    }
}

export const technicalIndicatorService = new TechnicalIndicatorService();