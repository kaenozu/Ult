import { 
  Alert, 
  AlertType, 
  AlertPriority, 
  PositionAlert, 
  AlertConfig,
  CooldownManager,
  OHLCV,
  StrategyResult 
} from './types';

export function detectEntrySignal(
  symbol: string,
  strategyResult: StrategyResult,
  currentPrice: number,
  config: AlertConfig,
  cooldown: CooldownManager,
  generateId: () => string
): Alert | null {
  if (!config.entrySignals) return null;
  if (strategyResult.confidence < config.minConfidence) return null;
  if (strategyResult.signal === 'HOLD') return null;

  const cooldownKey = `${symbol}_ENTRY_${strategyResult.signal}`;
  if (cooldown.isInCooldown(cooldownKey)) return null;

  const alert: Alert = {
    id: generateId(),
    type: 'ENTRY_SIGNAL',
    priority: strategyResult.confidence > 85 ? 'HIGH' : 'MEDIUM',
    symbol,
    title: `${strategyResult.signal} Signal - ${symbol}`,
    message: `${strategyResult.strategy}戦略が${strategyResult.signal}シグナルを検出しました。信頼度: ${strategyResult.confidence}%`,
    timestamp: new Date().toISOString(),
    data: {
      price: currentPrice,
      entryPrice: strategyResult.entryPrice,
      stopLoss: strategyResult.stopLoss,
      takeProfit: strategyResult.takeProfit,
      strategy: strategyResult.strategy,
      confidence: strategyResult.confidence,
      reason: strategyResult.reasoning,
    },
    actionable: true,
    action: {
      type: strategyResult.signal,
      price: strategyResult.entryPrice,
    },
    acknowledged: false,
  };

  cooldown.recordAlert(cooldownKey);
  return alert;
}

export function detectExitSignals(
  symbol: string,
  position: PositionAlert,
  currentData: OHLCV,
  config: AlertConfig,
  generateId: () => string
): Alert[] {
  const alerts: Alert[] = [];

  if (!config.exitSignals) return alerts;

  if (config.stopLossAlerts && position.stopLoss > 0) {
    if (currentData.low <= position.stopLoss) {
      alerts.push(createExitAlert(
        symbol,
        'STOP_LOSS',
        'CRITICAL',
        position.stopLoss,
        position,
        generateId
      ));
    }
  }

  if (config.takeProfitAlerts && position.takeProfit > 0) {
    if (currentData.high >= position.takeProfit) {
      alerts.push(createExitAlert(
        symbol,
        'TAKE_PROFIT',
        'HIGH',
        position.takeProfit,
        position,
        generateId
      ));
    }
  }

  return alerts;
}

export function updateTrailingStop(
  symbol: string,
  position: PositionAlert,
  highestPrice: number,
  lowestPrice: number,
  currentPrice: number,
  trailPercent: number,
  config: AlertConfig,
  generateId: () => string
): Alert | null {
  if (!config.trailingStopAlerts) return null;

  const isLong = position.entryPrice < currentPrice;
  let trailingStop: number;

  if (isLong) {
    trailingStop = highestPrice * (1 - trailPercent / 100);
    if (currentPrice <= trailingStop && currentPrice > position.entryPrice) {
      return createExitAlert(
        symbol,
        'TRAILING_STOP',
        'HIGH',
        currentPrice,
        position,
        generateId,
        `Trailing stop triggered at ${trailingStop.toFixed(0)} (High: ${highestPrice.toFixed(0)})`
      );
    }
  } else {
    trailingStop = lowestPrice * (1 + trailPercent / 100);
    if (currentPrice >= trailingStop && currentPrice < position.entryPrice) {
      return createExitAlert(
        symbol,
        'TRAILING_STOP',
        'HIGH',
        currentPrice,
        position,
        generateId,
        `Trailing stop triggered at ${trailingStop.toFixed(0)} (Low: ${lowestPrice.toFixed(0)})`
      );
    }
  }

  return null;
}

export function detectDrawdownAlert(
  symbol: string,
  currentDrawdown: number,
  peakEquity: number,
  currentEquity: number,
  config: AlertConfig,
  cooldown: CooldownManager,
  generateId: () => string
): Alert | null {
  if (!config.riskWarnings) return null;
  if (currentDrawdown < config.drawdownThreshold) return null;

  const cooldownKey = `${symbol}_DRAWDOWN`;
  if (cooldown.isInCooldown(cooldownKey)) return null;

  const alert: Alert = {
    id: generateId(),
    type: 'DRAWDOWN_ALERT',
    priority: currentDrawdown > 15 ? 'CRITICAL' : 'HIGH',
    symbol,
    title: `Drawdown Alert - ${symbol}`,
    message: `ドローダウンが${currentDrawdown.toFixed(1)}%に達しました。ピーク: ${peakEquity.toLocaleString()}, 現在: ${currentEquity.toLocaleString()}`,
    timestamp: new Date().toISOString(),
    data: {
      changePercent: -currentDrawdown,
    },
    actionable: true,
    action: {
      type: 'CLOSE',
    },
    acknowledged: false,
  };

  cooldown.recordAlert(cooldownKey);
  return alert;
}

export function detectVolatilityAlert(
  symbol: string,
  currentPrice: number,
  previousPrice: number,
  atr: number,
  config: AlertConfig,
  cooldown: CooldownManager,
  generateId: () => string
): Alert | null {
  if (!config.riskWarnings) return null;

  const priceChange = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
  const volatilityPercent = (atr / currentPrice) * 100;

  if (priceChange < config.volatilityThreshold && volatilityPercent < config.volatilityThreshold * 2) {
    return null;
  }

  const cooldownKey = `${symbol}_VOLATILITY`;
  if (cooldown.isInCooldown(cooldownKey)) return null;

  const alert: Alert = {
    id: generateId(),
    type: 'VOLATILITY_ALERT',
    priority: priceChange > 10 ? 'CRITICAL' : 'HIGH',
    symbol,
    title: `High Volatility - ${symbol}`,
    message: `価格変動: ${priceChange.toFixed(2)}%, ATR: ${volatilityPercent.toFixed(2)}%`,
    timestamp: new Date().toISOString(),
    data: {
      price: currentPrice,
      changePercent: priceChange,
    },
    actionable: false,
    acknowledged: false,
  };

  cooldown.recordAlert(cooldownKey);
  return alert;
}

function createExitAlert(
  symbol: string,
  type: AlertType,
  priority: AlertPriority,
  exitPrice: number,
  position: PositionAlert,
  generateId: () => string,
  customMessage?: string
): Alert {
  const pnl = (exitPrice - position.entryPrice);
  const pnlPercent = (pnl / position.entryPrice) * 100;

  return {
    id: generateId(),
    type,
    priority,
    symbol,
    title: `${type.replace('_', ' ')} - ${symbol}`,
    message: customMessage || `${type.replace('_', ' ')} triggered at ${exitPrice.toFixed(0)}`,
    timestamp: new Date().toISOString(),
    data: {
      price: exitPrice,
      entryPrice: position.entryPrice,
      exitPrice,
      pnl,
      changePercent: pnlPercent,
    },
    actionable: true,
    action: {
      type: 'CLOSE',
      price: exitPrice,
    },
    acknowledged: false,
  };
}
