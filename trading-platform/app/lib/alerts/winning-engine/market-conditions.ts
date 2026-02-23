import { Alert, AlertConfig, CooldownManager } from './types';

export function detectBreakout(
  symbol: string,
  currentPrice: number,
  resistanceLevel: number,
  supportLevel: number,
  volume: number,
  avgVolume: number,
  config: AlertConfig,
  cooldown: CooldownManager,
  generateId: () => string
): Alert | null {
  if (!config.breakoutAlerts) return null;

  const volumeSpike = volume > avgVolume * config.volumeSpikeThreshold;
  const breakoutUp = currentPrice > resistanceLevel * 0.995;
  const breakoutDown = currentPrice < supportLevel * 1.005;

  if (!breakoutUp && !breakoutDown) return null;

  const cooldownKey = `${symbol}_BREAKOUT_${breakoutUp ? 'UP' : 'DOWN'}`;
  if (cooldown.isInCooldown(cooldownKey)) return null;

  const alert: Alert = {
    id: generateId(),
    type: 'BREAKOUT',
    priority: volumeSpike ? 'HIGH' : 'MEDIUM',
    symbol,
    title: `${breakoutUp ? 'Upside' : 'Downside'} Breakout - ${symbol}`,
    message: `${breakoutUp ? '抵抗線' : '支持線'}を突破しました。出来高: ${(volume/avgVolume).toFixed(1)}倍平均`,
    timestamp: new Date().toISOString(),
    data: {
      price: currentPrice,
      volume,
      reason: breakoutUp 
        ? `Resistance broken at ${resistanceLevel.toFixed(0)}` 
        : `Support broken at ${supportLevel.toFixed(0)}`,
    },
    actionable: true,
    action: {
      type: breakoutUp ? 'BUY' : 'SELL',
      price: currentPrice,
    },
    acknowledged: false,
  };

  cooldown.recordAlert(cooldownKey);
  return alert;
}

export function detectTrendReversal(
  symbol: string,
  currentSignal: string,
  previousSignal: string,
  currentPrice: number,
  config: AlertConfig,
  cooldown: CooldownManager,
  generateId: () => string
): Alert | null {
  if (!config.trendReversalAlerts) return null;
  if (currentSignal === previousSignal) return null;
  if (currentSignal === 'HOLD' || previousSignal === 'HOLD') return null;

  const cooldownKey = `${symbol}_REVERSAL`;
  if (cooldown.isInCooldown(cooldownKey)) return null;

  const alert: Alert = {
    id: generateId(),
    type: 'TREND_REVERSAL',
    priority: 'HIGH',
    symbol,
    title: `Trend Reversal - ${symbol}`,
    message: `トレンドが${previousSignal}から${currentSignal}に反転しました`,
    timestamp: new Date().toISOString(),
    data: {
      price: currentPrice,
      reason: `Signal changed from ${previousSignal} to ${currentSignal}`,
    },
    actionable: true,
    action: {
      type: currentSignal as 'BUY' | 'SELL' | 'HOLD',
      price: currentPrice,
    },
    acknowledged: false,
  };

  cooldown.recordAlert(cooldownKey);
  return alert;
}

export function detectVolumeSpike(
  symbol: string,
  currentVolume: number,
  averageVolume: number,
  currentPrice: number,
  config: AlertConfig,
  cooldown: CooldownManager,
  generateId: () => string
): Alert | null {
  const ratio = currentVolume / averageVolume;
  if (ratio < config.volumeSpikeThreshold) return null;

  const cooldownKey = `${symbol}_VOLUME`;
  if (cooldown.isInCooldown(cooldownKey)) return null;

  const alert: Alert = {
    id: generateId(),
    type: 'VOLUME_SPIKE',
    priority: ratio > 5 ? 'HIGH' : 'MEDIUM',
    symbol,
    title: `Volume Spike - ${symbol}`,
    message: `出来高が${ratio.toFixed(1)}倍のスパイクを記録しました`,
    timestamp: new Date().toISOString(),
    data: {
      price: currentPrice,
      volume: currentVolume,
    },
    actionable: false,
    acknowledged: false,
  };

  cooldown.recordAlert(cooldownKey);
  return alert;
}

export function detectPriceGap(
  symbol: string,
  previousClose: number,
  currentOpen: number,
  config: AlertConfig,
  cooldown: CooldownManager,
  generateId: () => string
): Alert | null {
  const gapPercent = ((currentOpen - previousClose) / previousClose) * 100;
  const gapThreshold = 3;

  if (Math.abs(gapPercent) < gapThreshold) return null;

  const cooldownKey = `${symbol}_GAP_${gapPercent > 0 ? 'UP' : 'DOWN'}`;
  if (cooldown.isInCooldown(cooldownKey)) return null;

  const alert: Alert = {
    id: generateId(),
    type: 'PRICE_GAP',
    priority: Math.abs(gapPercent) > 5 ? 'HIGH' : 'MEDIUM',
    symbol,
    title: `${gapPercent > 0 ? 'Up' : 'Down'} Gap - ${symbol}`,
    message: `価格ギャップ: ${gapPercent > 0 ? '+' : ''}${gapPercent.toFixed(2)}%`,
    timestamp: new Date().toISOString(),
    data: {
      price: currentOpen,
      changePercent: gapPercent,
    },
    actionable: false,
    acknowledged: false,
  };

  cooldown.recordAlert(cooldownKey);
  return alert;
}
