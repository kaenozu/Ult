import { OHLCV } from '../types/shared';

/**
 * テクニカル指標計算サービス
 * 
 * 株価データから各種テクニカル指標を計算するサービスクラス。
 * utils.tsとanalysis.tsに散在していたロジックを一元化。
 * 
 * 対応指標:
 * - SMA（単純移動平均）
 * - EMA（指数平滑移動平均）
 * - RSI（相対力指数）
 * - MACD（移動平均収束拡散）
 * - ボリンジャーバンド
 * - ATR（平均真実範囲）
 * 
 * @example
 * ```typescript
 * const service = new TechnicalIndicatorService();
 * const sma = service.calculateSMA(prices, 20);
 * const rsi = service.calculateRSI(prices, 14);
 * ```
 */
class TechnicalIndicatorService {
    /**
     * 単純移動平均（SMA）を計算する
     * 
     * 指定された期間の単純移動平均を計算する。
     * 期間未満のデータポイントはNaNを返す。
     * 
     * @param prices - 終値の配列
     * @param period - 移動平均の期間
     * @returns SMA値の配列（期間未満はNaN）
     * 
     * @example
     * ```typescript
     * const prices = [100, 102, 101, 103, 105];
     * const sma3 = service.calculateSMA(prices, 3);
     * // [NaN, NaN, 101, 102, 103]
     * ```
     */
    calculateSMA(prices: number[], period: number): number[] {
        const sma: number[] = [];
        let sum = 0;

        for (let i = 0; i < prices.length; i++) {
            sum += prices[i];

            if (i >= period) {
                sum -= prices[i - period];
            }

            if (i < period - 1) {
                sma.push(NaN);
            } else {
                // If sum is NaN, it might be due to a NaN value in the current window or history.
                // We fallback to slice/reduce to ensure correctness and attempt to recover the sum.
                if (isNaN(sum)) {
                    const slice = prices.slice(i - period + 1, i + 1);
                    const freshSum = slice.reduce((a, b) => a + b, 0);
                    sma.push(freshSum / period);
                    sum = freshSum; // Reset sum to valid value if possible
                } else {
                    sma.push(sum / period);
                }
            }
        }
        return sma;
    }

    /**
     * 指数平滑移動平均（EMA）を計算する
     * 
     * 直近の価格により重みを置いた移動平均を計算する。
     * SMAよりも直近の価格変動に敏感に反応する。
     * 
     * @param prices - 終値の配列
     * @param period - EMAの期間
     * @returns EMA値の配列（期間未満はNaN）
     * 
     * @example
     * ```typescript
     * const prices = [100, 102, 101, 103, 105];
     * const ema3 = service.calculateEMA(prices, 3);
     * ```
     */
    calculateEMA(prices: number[], period: number): number[] {
        const ema: number[] = [];
        const multiplier = 2 / (period + 1);

        let sum = 0;
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sum += prices[i];
                ema.push(NaN);
            } else if (i === period - 1) {
                sum += prices[i];
                ema.push(sum / period);
            } else {
                const prevEMA = ema[i - 1];
                const emaValue = (prices[i] - prevEMA) * multiplier + prevEMA;
                ema.push(emaValue);
            }
        }
        return ema;
    }

    /**
     * 相対力指数（RSI）を計算する
     * 
     * 価格変動の勢いを測定するオシレーター指標。
     * 0-100の範囲で、70以上は買われすぎ、30以下は売られすぎを示唆。
     * 
     * @param prices - 終値の配列
     * @param period - RSIの計算期間（デフォルト: 14）
     * @returns RSI値の配列（0-100、期間未満はNaN）
     * 
     * @example
     * ```typescript
     * const prices = [100, 102, 101, 103, 105, 104, 106];
     * const rsi = service.calculateRSI(prices, 14);
     * // RSI > 70: 買われすぎ（売りシグナル）
     * // RSI < 30: 売られすぎ（買いシグナル）
     * ```
     */
    calculateRSI(prices: number[], period: number = 14): number[] {
        const rsi: number[] = [];
        const gains: number[] = [];
        const losses: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }

        // First RSI
        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                rsi.push(NaN);
            } else if (i === period) {
                const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
                const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
                const rs = avgGain / (avgLoss || 0.0001);
                rsi.push(100 - 100 / (1 + rs));
            } else {
                // Simple SMA version
                const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
                const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
                const rs = avgGain / (avgLoss || 0.0001);
                rsi.push(100 - 100 / (1 + rs));
            }
        }

        return rsi;
    }

    /**
     * 移動平均収束拡散（MACD）を計算する
     * 
     * 短期EMAと長期EMAの差からトレンドの勢いと方向性を測定する。
     * ゴールデンクロス（MACDがシグナルを上抜け）: 買いシグナル
     * デッドクロス（MACDがシグナルを下抜け）: 売りシグナル
     * 
     * @param prices - 終値の配列
     * @param fastPeriod - 短期EMAの期間（デフォルト: 12）
     * @param slowPeriod - 長期EMAの期間（デフォルト: 26）
     * @param signalPeriod - シグナル線の期間（デフォルト: 9）
     * @returns MACD、シグナル線、ヒストグラムの配列
     * 
     * @example
     * ```typescript
     * const prices = [100, 102, 101, 103, 105, 104, 106];
     * const { macd, signal, histogram } = service.calculateMACD(prices);
     * // macd > signal: 買いシグナル
     * // macd < signal: 売りシグナル
     * ```
     */
    calculateMACD(
        prices: number[],
        fastPeriod: number = 12,
        slowPeriod: number = 26,
        signalPeriod: number = 9
    ): { macd: number[]; signal: number[]; histogram: number[] } {
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);

        const macdLine = prices.map((_, i) => fastEMA[i] - slowEMA[i]);
        const validMacd = macdLine.filter(v => !isNaN(v));
        const signalEMA = this.calculateEMA(validMacd, signalPeriod);

        const signal: number[] = [];
        const histogram: number[] = [];
        let signalIndex = 0;

        for (let i = 0; i < prices.length; i++) {
            if (i < slowPeriod - 1) {
                signal.push(NaN);
                histogram.push(NaN);
            } else {
                const sigValue = signalEMA[signalIndex] || NaN;
                signal.push(sigValue);
                histogram.push(macdLine[i] - sigValue);
                signalIndex++;
            }
        }

        return { macd: macdLine, signal, histogram };
    }

    /**
     * ボリンジャーバンドを計算する
     * 
     * 移動平均と標準偏差から価格の変動範囲を示すバンドを計算する。
     * 価格が上限を超えた場合: 買われすぎの可能性
     * 価格が下限を下回った場合: 売られすぎの可能性
     * 
     * @param prices - 終値の配列
     * @param period - SMAの期間（デフォルト: 20）
     * @param stdDev - 標準偏差の倍率（デフォルト: 2）
     * @returns 上限線、中心線（SMA）、下限線の配列
     * 
     * @example
     * ```typescript
     * const prices = [100, 102, 101, 103, 105, 104, 106];
     * const { upper, middle, lower } = service.calculateBollingerBands(prices);
     * // price > upper: 買われすぎ
     * // price < lower: 売られすぎ
     * ```
     */
    calculateBollingerBands(
        prices: number[],
        period: number = 20,
        stdDev: number = 2
    ): { upper: number[]; middle: number[]; lower: number[] } {
        const middle = this.calculateSMA(prices, period);
        const upper: number[] = [];
        const lower: number[] = [];

        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                upper.push(NaN);
                lower.push(NaN);
            } else {
                const slice = prices.slice(i - period + 1, i + 1);
                const mean = middle[i];
                const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
                const std = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
                upper.push(mean + stdDev * std);
                lower.push(mean - stdDev * std);
            }
        }

        return { upper, middle, lower };
    }

    /**
     * 平均真実範囲（ATR）を計算する
     * 
     * 価格のボラティリティ（変動性）を測定する指標。
     * リスク管理や損切り・利確の目安として使用される。
     * 
     * True Range = max(High-Low, |High-前日Close|, |Low-前日Close|)
     * ATR = True Rangeの移動平均
     * 
     * @param ohlcv - OHLCVデータ配列
     * @param period - ATRの計算期間（デフォルト: 14）
     * @returns ATR値の配列（期間未満はNaN）
     * 
     * @example
     * ```typescript
     * const atr = service.calculateATR(ohlcvData, 14);
     * // ATRが大きい: 高ボラティリティ
     * // ATRが小さい: 低ボラティリティ
     * ```
     */
    calculateATR(ohlcv: OHLCV[], period: number = 14): number[] {
        if (ohlcv.length === 0) return [];
        const tr: number[] = [ohlcv[0].high - ohlcv[0].low];

        for (let i = 1; i < ohlcv.length; i++) {
            const hl = ohlcv[i].high - ohlcv[i].low;
            const hpc = Math.abs(ohlcv[i].high - ohlcv[i - 1].close);
            const lpc = Math.abs(ohlcv[i].low - ohlcv[i - 1].close);
            tr.push(Math.max(hl, hpc, lpc));
        }

        const atr: number[] = [];
        for (let i = 0; i < ohlcv.length; i++) {
            if (i < period - 1) {
                atr.push(NaN);
            } else if (i === period - 1) {
                const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
                atr.push(sum / period);
            } else {
                const prevATR = atr[i - 1];
                atr.push((prevATR * (period - 1) + tr[i]) / period);
            }
        }

        return atr;
    }
}

/**
 * TechnicalIndicatorServiceのシングルトンインスタンス
 * 
 * アプリケーション全体で共有されるテクニカル指標計算サービス。
 * 
 * @example
 * ```typescript
 * import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';
 * 
 * const sma = technicalIndicatorService.calculateSMA(prices, 20);
 * const rsi = technicalIndicatorService.calculateRSI(prices, 14);
 * ```
 */
export const technicalIndicatorService = new TechnicalIndicatorService();
