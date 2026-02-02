import { OHLCV } from '@/app/types';

export interface BreakoutEvent {
  date: string;
  type: 'BULL_BREAKOUT' | 'BEAR_BREAKOUT';
  price: number;
  volume: number;
  volumeRatio: number; // 通常ボリュームに対する倍率
  resistanceLevel?: number; // 突破した抵抗線
  supportLevel?: number; // 突破した支持線
}

export interface BreakoutResult {
  events: BreakoutEvent[];
  lastEvent?: BreakoutEvent;
  bullishBreakouts: number;
  bearishBreakouts: number;
  averageVolumeRatio: number;
}

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  strength: number;
}

/**
 * ブレイクアウトを検知
 * 
 * ロジック:
 * 1. 出来高が平均の2倍以上
 * 2. 強い抵抗線/支持線（strength >= 0.5）を突破
 * 3. 価格が突破を維持（連続してその価格以上/以下）
 */
export function detectBreakouts(
  data: OHLCV[],
  volumeProfile: VolumeProfileLevel[],
  options: {
    volumeMultiplier?: number;      // ボリューム倍率の閾値（デフォルト: 2.0）
    minProfileStrength?: number;   // ボリュームプロフィルの強度閾値（デフォルト: 0.5）
    confirmationCandles?: number;   // 確認足数（デフォルト: 1）
  } = {}
): BreakoutResult {
  const {
    volumeMultiplier = 2.0,
    minProfileStrength = 0.5,
    confirmationCandles = 1
  } = options;

  if (data.length < 20 || volumeProfile.length === 0) {
    return {
      events: [],
      bullishBreakouts: 0,
      bearishBreakouts: 0,
      averageVolumeRatio: 0
    };
  }

  const events: BreakoutEvent[] = [];
  const avgVolume = data.slice(-50).reduce((sum, d) => sum + d.volume, 0) / Math.min(50, data.length);
  
  // 強いレベルのみフィルタリング
  const strongLevels = volumeProfile.filter(l => l.strength >= minProfileStrength);
  
  for (let i = 20; i < data.length; i++) {
    const candle = data[i];
    const prevCandle = data[i - 1];
    const nextCandle = i + 1 < data.length ? data[i + 1] : null;
    
    // 出来高チェック
    const volumeRatio = candle.volume / avgVolume;
    if (volumeRatio < volumeMultiplier) continue;
    
    // ブルブレイクアウト検知（抵抗線突破）
    const resistanceBreach = strongLevels.find(
      l => l.price >= prevCandle.low && l.price <= candle.high
    );
    
    if (resistanceBreach && candle.close > prevCandle.close) {
      // 確認: 次の足も高いままか
      let confirmed = false;
      if (nextCandle && nextCandle.close > resistanceBreach.price) {
        confirmed = true;
      } else if (confirmationCandles === 1) {
        confirmed = true;
      } else {
        confirmed = true;
        for (let j = 1; j <= confirmationCandles && i + j < data.length; j++) {
          if (data[i + j].close <= resistanceBreach.price) {
            confirmed = false;
            break;
          }
        }
      }
      
      if (confirmed) {
        events.push({
          date: candle.date,
          type: 'BULL_BREAKOUT',
          price: candle.high,
          volume: candle.volume,
          volumeRatio,
          resistanceLevel: resistanceBreach.price
        });
      }
    }
    
    // ベアブレイクアウト検知（支持線突破）
    const supportBreach = strongLevels.find(
      l => l.price <= prevCandle.high && l.price >= candle.low
    );
    
    if (supportBreach && candle.close < prevCandle.close) {
      let confirmed = false;
      if (nextCandle && nextCandle.close < supportBreach.price) {
        confirmed = true;
      } else if (confirmationCandles === 1) {
        confirmed = true;
      } else {
        confirmed = true;
        for (let j = 1; j <= confirmationCandles && i + j < data.length; j++) {
          if (data[i + j].close >= supportBreach.price) {
            confirmed = false;
            break;
          }
        }
      }
      
      if (confirmed) {
        events.push({
          date: candle.date,
          type: 'BEAR_BREAKOUT',
          price: candle.low,
          volume: candle.volume,
          volumeRatio,
          supportLevel: supportBreach.price
        });
      }
    }
  }
  
  const bullishBreakouts = events.filter(e => e.type === 'BULL_BREAKOUT').length;
  const bearishBreakouts = events.filter(e => e.type === 'BEAR_BREAKOUT').length;
  const averageVolumeRatio = events.length > 0 
    ? events.reduce((sum, e) => sum + e.volumeRatio, 0) / events.length 
    : 0;
  
  return {
    events,
    lastEvent: events[events.length - 1],
    bullishBreakouts,
    bearishBreakouts,
    averageVolumeRatio
  };
}

/**
 * 次のブレイクアウト可能性を予測
 * 
 * 現在価格がボリュームプロフィルの強いレベルに近いかを判定
 */
export function predictNextBreakout(
  currentPrice: number,
  volumeProfile: VolumeProfileLevel[],
  options: {
    thresholdPercent?: number;  // 閾値パーセント（デフォルト: 2%）
    minStrength?: number;       // 最小強度（デフォルト: 0.5）
  } = {}
): {
  bullishBreakout: { price: number; strength: number } | null;
  bearishBreakout: { price: number; strength: number } | null;
} {
  const { thresholdPercent = 0.02, minStrength = 0.5 } = options;
  const threshold = currentPrice * thresholdPercent;
  
  // 近くの強いレベルを探す
  const nearbyResistance = volumeProfile
    .filter(l => l.strength >= minStrength && l.price > currentPrice)
    .filter(l => l.price - currentPrice <= threshold)
    .sort((a, b) => a.price - b.price)[0];
    
  const nearbySupport = volumeProfile
    .filter(l => l.strength >= minStrength && l.price < currentPrice)
    .filter(l => currentPrice - l.price <= threshold)
    .sort((a, b) => b.price - a.price)[0];
    
  return {
    bullishBreakout: nearbyResistance 
      ? { price: nearbyResistance.price, strength: nearbyResistance.strength }
      : null,
    bearishBreakout: nearbySupport
      ? { price: nearbySupport.price, strength: nearbySupport.strength }
      : null
  };
}
