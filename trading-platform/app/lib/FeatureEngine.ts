import { OHLCV } from '@/app/types';

/**
 * 特徴量抽出エンジン (Feature Engineering Core)
 * 生の市場データをMLモデルが学習・推論可能な正規化数値配列に変換します。
 */
export class FeatureEngine {
  /**
   * OHLCVデータから特徴量ベクトルを抽出する
   * @param data - 最低2件以上のOHLCVデータ
   * @returns 正規化された数値配列
   */
  extract(data: OHLCV[]): number[] {
    if (data.length < 2) {
      throw new Error('Insufficient data for feature extraction (minimum 2 points required)');
    }

    const features: number[] = [];
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    // 1. 価格変動率 (Returns) - 最も重要な特徴量
    const priceChange = (latest.close - previous.close) / previous.close;
    features.push(priceChange);

    // 2. 日中変動幅 (Volatility Proxy)
    const intradayRange = (latest.high - latest.low) / latest.close;
    features.push(intradayRange);

    // 3. 出来高の相対変化
    const volumeChange = previous.volume > 0 ? (latest.volume - previous.volume) / previous.volume : 0;
    // 出来高の変化は大きくなりやすいため、対数スケールや上限設定を検討
    features.push(Math.min(5, Math.max(-5, volumeChange)));

    // 4. 終値の相対位置 (H/L range内のどこにあるか)
    const range = latest.high - latest.low;
    const position = range > 0 ? (latest.close - latest.low) / range : 0.5;
    features.push(position);

    return features;
  }

  /**
   * シーケンスデータを抽出する (LSTM等の時系列モデル用)
   * @param data - OHLCVデータ
   * @param windowSize - 過去何日分を一つの入力とするか
   */
  extractSequence(data: OHLCV[], windowSize: number = 10): number[][] {
    if (data.length < windowSize + 1) {
      throw new Error(`Insufficient data for sequence extraction (minimum ${windowSize + 1} points required)`);
    }

    const sequences: number[][] = [];
    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i + 1);
      sequences.push(this.extract(window));
    }
    return sequences;
  }
}

export const featureEngine = new FeatureEngine();
