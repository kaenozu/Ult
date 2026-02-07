import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { handleApiError, validationError } from '@/app/lib/error-handler';
import { requireAuth } from '@/app/lib/auth';
import {
  AdvancedBacktestEngine,
  DEFAULT_BACKTEST_CONFIG,
  type BacktestConfig,
  type BacktestResult as EngineBacktestResult,
  type Trade,
} from '@/app/lib/backtest/AdvancedBacktestEngine';
import { OverfittingDetector } from '@/app/lib/backtest/OverfittingDetector';
import { createStrategyPreset, type StrategyPresetId } from '@/app/lib/backtest/strategyPresets';
import { fetchMarketHistory } from '@/app/lib/market-data-fetcher';
import { buildDataQualitySummary } from '@/app/lib/market-data-quality';
import type { BacktestResult, BacktestTrade } from '@/app/types';
import type { OHLCV } from '@/app/types';

const VALID_STRATEGIES: StrategyPresetId[] = ['sma', 'rsi', 'buy_hold'];

function validateSymbol(symbol: string | null): string | null {
  if (!symbol) return null;
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9.,^]+$/.test(normalized)) return null;
  if (normalized.length > 20) return null;
  return normalized;
}

function buildBacktestConfig(market: 'japan' | 'usa', data: OHLCV[]): BacktestConfig {
  const avgVolume =
    data.length > 0
      ? data.reduce((sum, d) => sum + (Number.isFinite(d.volume) ? d.volume : 0), 0) / data.length
      : 1000000;

  return {
    ...DEFAULT_BACKTEST_CONFIG,
    initialCapital: 100000,
    allowShort: true,
    realisticMode: true,
    market,
    averageDailyVolume: Math.max(1, Math.floor(avgVolume)),
    slippageEnabled: true,
    commissionEnabled: true,
    partialFillEnabled: false,
    latencyEnabled: false,
    maxDrawdown: 35,
  };
}

function mapTrades(trades: Trade[], symbol: string): BacktestTrade[] {
  return trades.map((trade) => ({
    symbol,
    type: trade.side === 'LONG' ? 'BUY' : 'SELL',
    entryPrice: round(trade.entryPrice, 4),
    exitPrice: trade.exitPrice !== undefined ? round(trade.exitPrice, 4) : undefined,
    entryDate: trade.entryDate,
    exitDate: trade.exitDate,
    profitPercent: round(trade.pnlPercent, 2),
    status: trade.exitDate ? 'CLOSED' : 'OPEN',
    exitReason: trade.exitReason,
  }));
}

function buildUiResult(
  symbol: string,
  engineResult: EngineBacktestResult,
  walkForwardMetrics?: BacktestResult['walkForwardMetrics']
): BacktestResult {
  const trades = mapTrades(engineResult.trades, symbol);
  const profitPercents = trades.map((t) => t.profitPercent ?? 0);
  const winners = profitPercents.filter((p) => p > 0);
  const losers = profitPercents.filter((p) => p < 0);

  const avgProfit = winners.length > 0 ? average(winners) : 0;
  const avgLoss = losers.length > 0 ? average(losers) : 0;
  const winRate = engineResult.metrics.winRate;
  const lossRate = 100 - winRate;
  const expectancy = (winRate / 100) * avgProfit + (lossRate / 100) * avgLoss;

  return {
    symbol,
    totalTrades: engineResult.metrics.totalTrades,
    winningTrades: engineResult.metrics.winningTrades,
    losingTrades: engineResult.metrics.losingTrades,
    winRate: round(winRate, 1),
    totalReturn: round(engineResult.metrics.totalReturn, 2),
    avgProfit: round(avgProfit, 2),
    avgLoss: round(avgLoss, 2),
    profitFactor: round(engineResult.metrics.profitFactor, 2),
    maxDrawdown: round(engineResult.metrics.maxDrawdown, 2),
    sharpeRatio: round(engineResult.metrics.sharpeRatio, 2),
    sortinoRatio: round(engineResult.metrics.sortinoRatio ?? 0, 2),
    calmarRatio: round(engineResult.metrics.calmarRatio ?? 0, 2),
    expectancy: round(expectancy, 2),
    trades,
    startDate: engineResult.startDate,
    endDate: engineResult.endDate,
    walkForwardMetrics,
  };
}

function round(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const symbol = validateSymbol(searchParams.get('symbol'));
    const marketParam = searchParams.get('market');
    const market = marketParam === 'japan' || marketParam === 'usa' ? marketParam : 'usa';
    const strategyParamRaw = searchParams.get('strategy');
    const strategyParam = (strategyParamRaw || '').toLowerCase() as StrategyPresetId;
    const strategyId = VALID_STRATEGIES.includes(strategyParam) ? strategyParam : 'sma';
    const startDate = searchParams.get('startDate') || undefined;

    if (!symbol) {
      return validationError('Symbol is required', 'symbol');
    }

    const history = await fetchMarketHistory(request.url, symbol, {
      market,
      startDate,
      interval: '1d',
    });

    if (!history.data.length) {
      return NextResponse.json(
        {
          error: 'No historical data available for symbol.',
        },
        { status: 404 }
      );
    }

    if (history.data.length < 60) {
      return validationError('Not enough data points for backtest.', 'symbol');
    }

    const config = buildBacktestConfig(market, history.data);
    const engine = new AdvancedBacktestEngine(config);
    engine.loadData(symbol, history.data);

    const strategy = createStrategyPreset(strategyId);
    const engineResult = await engine.runBacktest(strategy, symbol);

    const diagnostics: {
      overfitting?: ReturnType<OverfittingDetector['analyze']>;
      inSample?: number;
      outOfSample?: number;
    } = {};

    let walkForwardMetrics: BacktestResult['walkForwardMetrics'] | undefined;

    if (history.data.length >= 120) {
      const splitIndex = Math.max(60, Math.floor(history.data.length * 0.7));
      const inSampleData = history.data.slice(0, splitIndex);
      const outSampleData = history.data.slice(splitIndex);

      if (outSampleData.length >= 30) {
        const inEngine = new AdvancedBacktestEngine(config);
        inEngine.loadData(symbol, inSampleData);
        const inResult = await inEngine.runBacktest(createStrategyPreset(strategyId), symbol);

        const outEngine = new AdvancedBacktestEngine(config);
        outEngine.loadData(symbol, outSampleData);
        const outResult = await outEngine.runBacktest(createStrategyPreset(strategyId), symbol);

        const detector = new OverfittingDetector();
        diagnostics.overfitting = detector.analyze(inResult, outResult);
        diagnostics.inSample = round(inResult.metrics.winRate, 2);
        diagnostics.outOfSample = round(outResult.metrics.winRate, 2);

        walkForwardMetrics = {
          inSampleAccuracy: round(inResult.metrics.winRate, 2),
          outOfSampleAccuracy: round(outResult.metrics.winRate, 2),
          overfitScore: inResult.metrics.winRate > 0
            ? round(outResult.metrics.winRate / inResult.metrics.winRate, 2)
            : 0,
          parameterStability: 0,
        };
      }
    }

    const uiResult = buildUiResult(symbol, engineResult, walkForwardMetrics);
    const dataQuality = buildDataQualitySummary(symbol, history.data);

    const warningSet = new Set<string>();
    history.warnings.forEach((w) => warningSet.add(w));
    dataQuality.warnings.forEach((w) => warningSet.add(w));
    dataQuality.errors.forEach((e) => warningSet.add(`Data quality error: ${e}`));
    diagnostics.overfitting?.warnings?.forEach((w) => warningSet.add(w));

    return NextResponse.json({
      result: uiResult,
      dataQuality,
      diagnostics,
      warnings: Array.from(warningSet),
      metadata: history.metadata,
    });
  } catch (error) {
    return handleApiError(error, 'backtest');
  }
}
