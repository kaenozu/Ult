import { OHLCV } from '../types/shared';
import {
    calculateSMA,
    calculateEMA,
    calculateRSI,
    calculateMACD,
    calculateBollingerBands,
    calculateATR as utilsCalculateATR
} from './utils';

/**
 * テクニカル指標計算サービス
 * 
 * 株式取引で使用される主要なテクニカル指標を計算するサービスクラス。
 * 実際の計算はutils.tsに委譲し、一貫性を確保している。
 * 
 * サポートする指標:
 * - SMA (Simple Moving Average): 単純移動平均
 * - EMA (Exponential Moving Average): 指数移動平均
 * - RSI (Relative Strength Index): 相対力指数
 * - MACD (Moving Average Convergence Divergence): 移動平均収束拡散法
 * - ボリンジャーバンド: 標準偏差を使用した価格帯
 * - ATR (Average True Range): 平均真の範囲（ボラティリティ指標）
 * 
 * @example
 * ```typescript
 * import { technicalIndicatorService } from './TechnicalIndicatorService';
 * 
 * const prices = [100, 102, 101, 103, 105];
 * const rsi = technicalIndicatorService.calculateRSI(prices, 14);
 * const sma = technicalIndicatorService.calculateSMA(prices, 20);
 * ```
 */
class TechnicalIndicatorService {
    /**
     * 単純移動平均（SMA）を計算
     * 
     * 指定された期間の終値の平均値を計算する。
     * トレンド分析やサポート・レジスタンスの識別に使用される。
     * 
     * @param prices - 終値の配列
     * @param period - 計算期間（例: 20日移動平均なら20）
     * @returns SMA値の配列。期間に満たない初期値はNaN
     * 
     * @example
     * ```typescript
     * const sma20 = technicalIndicatorService.calculateSMA(prices, 20);
     * const latestSMA = sma20[sma20.length - 1];
     * ```
     */
    calculateSMA(prices: number[], period: number): number[] {
        return calculateSMA(prices, period);
    }

    /**
     * 指数移動平均（EMA）を計算
     * 
     * 最近の価格により大きな重みを与える移動平均。
     * SMAよりも価格変動に素早く反応するため、短期トレードに適している。
     * 
     * @param prices - 終値の配列
     * @param period - 計算期間（例: 12日EMAなら12）
     * @returns EMA値の配列
     * 
     * @example
     * ```typescript
     * const ema12 = technicalIndicatorService.calculateEMA(prices, 12);
     * ```
     */
    calculateEMA(prices: number[], period: number): number[] {
        return calculateEMA(prices, period);
    }

    /**
     * 相対力指数（RSI）を計算
     * 
     * 買われすぎ・売られすぎを判断するモメンタム指標。
     * 0-100の範囲で、一般的に70以上が買われすぎ、30以下が売られすぎと判断される。
     * 
     * @param prices - 終値の配列
     * @param period - 計算期間（デフォルト: 14日）
     * @returns RSI値の配列（0-100）
     * 
     * @example
     * ```typescript
     * const rsi = technicalIndicatorService.calculateRSI(prices, 14);
     * const currentRSI = rsi[rsi.length - 1];
     * if (currentRSI > 70) console.log('買われすぎ');
     * if (currentRSI < 30) console.log('売られすぎ');
     * ```
     */
    calculateRSI(prices: number[], period: number = 14): number[] {
        return calculateRSI(prices, period);
    }

    /**
     * MACD（移動平均収束拡散法）を計算
     * 
     * トレンドの強さと方向性を判断する指標。
     * MACDラインとシグナルラインのクロスオーバーで売買シグナルを生成。
     * 
     * @param prices - 終値の配列
     * @param fastPeriod - 短期EMAの期間（デフォルト: 12）
     * @param slowPeriod - 長期EMAの期間（デフォルト: 26）
     * @param signalPeriod - シグナルラインの期間（デフォルト: 9）
     * @returns MACD、シグナル、ヒストグラムの配列を含むオブジェクト
     * 
     * @example
     * ```typescript
     * const macd = technicalIndicatorService.calculateMACD(prices);
     * const currentMACD = macd.macd[macd.macd.length - 1];
     * const currentSignal = macd.signal[macd.signal.length - 1];
     * if (currentMACD > currentSignal) console.log('強気シグナル');
     * ```
     */
    calculateMACD(
        prices: number[],
        fastPeriod: number = 12,
        slowPeriod: number = 26,
        signalPeriod: number = 9
    ): { macd: number[]; signal: number[]; histogram: number[] } {
        return calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
    }

    /**
     * ボリンジャーバンドを計算
     * 
     * 価格の統計的な上限・下限を示すバンド。
     * 標準偏差を使用してボラティリティを可視化する。
     * 
     * @param prices - 終値の配列
     * @param period - 移動平均の期間（デフォルト: 20）
     * @param stdDev - 標準偏差の倍数（デフォルト: 2）
     * @returns 上限バンド、中央線（SMA）、下限バンドの配列を含むオブジェクト
     * 
     * @example
     * ```typescript
     * const bb = technicalIndicatorService.calculateBollingerBands(prices, 20, 2);
     * const currentPrice = prices[prices.length - 1];
     * if (currentPrice > bb.upper[bb.upper.length - 1]) {
     *   console.log('上限バンド突破（買われすぎの可能性）');
     * }
     * ```
     */
    calculateBollingerBands(
        prices: number[],
        period: number = 20,
        stdDev: number = 2
    ): { upper: number[]; middle: number[]; lower: number[] } {
        return calculateBollingerBands(prices, period, stdDev);
    }

    /**
     * ATR（平均真の範囲）を計算
     * 
     * ボラティリティを測定する指標。
     * 価格の変動幅を示し、ストップロスの設定やポジションサイズの決定に使用される。
     * 
     * @param ohlcv - OHLCVデータ配列（高値、安値、終値が必要）
     * @param period - 計算期間（デフォルト: 14）
     * @returns ATR値の配列
     * 
     * @example
     * ```typescript
     * const atr = technicalIndicatorService.calculateATR(ohlcvData, 14);
     * const currentATR = atr[atr.length - 1];
     * const stopLoss = currentPrice - (currentATR * 2); // ATRの2倍でストップロス設定
     * ```
     */
    calculateATR(ohlcv: OHLCV[], period: number = 14): number[] {
        const highs = ohlcv.map(d => d.high);
        const lows = ohlcv.map(d => d.low);
        const closes = ohlcv.map(d => d.close);
        return utilsCalculateATR(highs, lows, closes, period);
    }
}

export const technicalIndicatorService = new TechnicalIndicatorService();
