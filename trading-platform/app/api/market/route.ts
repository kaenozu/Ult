import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  handleApiError,
  validationError,
  rateLimitError,
} from '@/app/lib/error-handler';
import { ipRateLimiter, getClientIp } from '@/app/lib/ip-rate-limit';
import { isTSEOpen, getMarketStatusMessage, formatNextOpenTime } from '@/app/lib/market-hours';

// Define explicit types for Yahoo Finance responses
interface YahooChartResult {
  meta: {
    currency: string;
    symbol: string;
    regularMarketPrice: number;
    [key: string]: unknown;
  };
  quotes: {
    date: Date | string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
    [key: string]: unknown;
  }[];
}

interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketState?: string;
  longName?: string;
  shortName?: string;
  [key: string]: unknown; // Safer than 'any' or union of primitives
}

export const yf = new YahooFinance();

function formatSymbol(symbol: string, market?: string): string {
  // Never add suffix to indices (starting with ^)
  if (symbol.startsWith('^')) {
    return symbol;
  }

  if (market === 'japan' || (symbol.match(/^\d{4}$/) && !symbol.endsWith('.T'))) {
    return `${symbol}.T`;
  }
  return symbol;
}

/**
 * Check if a symbol represents a Japanese stock
 */
function isJapaneseStock(symbol: string, market?: string): boolean {
  return market === 'japan' || symbol.endsWith('.T');
}

export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  if (!ipRateLimiter.check(clientIp)) {
    return rateLimitError();
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const symbol = searchParams.get('symbol')?.trim().toUpperCase();
  const market = searchParams.get('market');
  const interval = searchParams.get('interval'); // New: 1m, 5m, 15m, 1h, 4h, 1d

  // Input validation and sanitization
  if (!symbol) {
    return validationError('Symbol is required', 'symbol');
  }

  // Validate symbol format (alphanumeric, dots, commas, and caret for indices)
  if (!/^[A-Z0-9.,^]+$/.test(symbol)) {
    return validationError('Invalid symbol format', 'symbol');
  }

  // Validate symbol length to prevent DoS
  // Single symbol: max 20 chars
  // Batch symbols (comma separated): max 1000 chars
  const isBatch = symbol.includes(',');
  if (symbol.length > (isBatch ? 1000 : 20)) {
    return NextResponse.json({ error: 'Symbol too long' }, { status: 400 });
  }

  // Validate type parameter
  if (type && !['history', 'quote'].includes(type)) {
    return validationError('Invalid type parameter', 'type');
  }

  // Validate market parameter
  if (market && !['japan', 'usa'].includes(market)) {
    return validationError('Invalid market parameter', 'market');
  }

  // Validate interval parameter (for history type)
  const validIntervals = ['1m', '5m', '15m', '1h', '4h', '1d', '1wk', '1mo'];
  if (interval && !validIntervals.includes(interval)) {
    return validationError('Invalid interval. Use 1m, 5m, 15m, 1h, 4h, 1d, 1wk, or 1mo', 'interval');
  }

  const yahooSymbol = formatSymbol(symbol, market || undefined);

  try {
    if (type === 'history') {
      const startDateParam = searchParams.get('startDate');
      let period1: string;

      if (startDateParam) {
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateParam) || isNaN(Date.parse(startDateParam))) {
          return validationError('Invalid startDate format. Use YYYY-MM-DD.', 'startDate');
        }
        period1 = startDateParam;
      } else {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        period1 = startDate.toISOString().split('T')[0];
      }

      try {
        // Map UI interval names to Yahoo Finance interval format
        // Note: Yahoo Finance doesn't support 4h, so we map 4H to 1h
        // IMPORTANT: Yahoo Finance doesn't support intraday intervals (1m, 5m, 15m, 1h) for Japanese stocks
        // We need to check if this is a Japanese stock and an intraday interval
        const isJapaneseStock = yahooSymbol.endsWith('.T');
        const isIntradayInterval = interval && ['1m', '5m', '15m', '1h', '4H'].includes(interval);

        let finalInterval: '1d' | '1m' | '5m' | '15m' | '1h' | '1wk' | '1mo' | '2m' | '30m' | '60m' | '90m' | '5d' | '3mo' | undefined;

        if (isJapaneseStock && isIntradayInterval) {
          // Japanese stocks don't support intraday data, fall back to daily
          finalInterval = '1d';
        } else {
          finalInterval =
            interval === 'D' ? '1d' :
              interval === '1H' ? '1h' :
                interval === '4H' ? '1h' :  // 4h not supported, use 1h instead
                  interval?.toLowerCase() === '15m' ? '15m' :
                    interval?.toLowerCase() === '1m' ? '1m' :
                      interval?.toLowerCase() === '5m' ? '5m' :
                        undefined;
        }

        // Build chart options - pass interval if specified
        const result = finalInterval
          ? await yf.chart(yahooSymbol, { period1, interval: finalInterval }) as YahooChartResult
          : await yf.chart(yahooSymbol, { period1 }) as YahooChartResult;

        if (!result || !result.quotes || result.quotes.length === 0) {
          return NextResponse.json({ data: [], warning: 'No historical data found' });
        }

        // Format date based on interval type
        // Daily/Weekly/Monthly: YYYY-MM-DD
        // Intraday (1m, 5m, 15m, 1h): YYYY-MM-DD HH:mm
        const isIntraday = finalInterval && ['1m', '5m', '15m', '1h'].includes(finalInterval);

        // Add warning if we fell back to daily data for Japanese stock with intraday interval
        const warning = isJapaneseStock && isIntradayInterval
          ? `Note: Intraday data (1m, 5m, 15m, 1h, 4H) is not available for Japanese stocks. Daily data is shown instead.`
          : undefined;

        // データ欠損処理: 前日の終値を追跡
        let lastValidClose: number | null = null;

        const ohlcv = result.quotes.map((q, index) => {
          let dateStr: string;
          if (q.date instanceof Date) {
            if (isIntraday) {
              // Format: YYYY-MM-DD HH:mm (e.g., "2026-01-28 09:30")
              const year = q.date.getFullYear();
              const month = String(q.date.getMonth() + 1).padStart(2, '0');
              const day = String(q.date.getDate()).padStart(2, '0');
              const hours = String(q.date.getHours()).padStart(2, '0');
              const minutes = String(q.date.getMinutes()).padStart(2, '0');
              dateStr = `${year}-${month}-${day} ${hours}:${minutes}`;
            } else {
              // Format: YYYY-MM-DD for daily/weekly/monthly
              dateStr = q.date.toISOString().split('T')[0];
            }
          } else {
            dateStr = String(q.date);
          }

          // データ欠損処理: nullを0で埋めると価格急落のように見えるため、
          // 前日の終値で補間する
          const hasValidClose = q.close !== null && q.close !== undefined && q.close > 0;
          
          // 有効な終値を記録
          if (hasValidClose) {
            lastValidClose = q.close;
          }
          
          // 補間値の計算
          const interpolatedClose = hasValidClose ? q.close : (lastValidClose ?? 0);
          
          return {
            date: dateStr,
            open: q.open ?? interpolatedClose,
            high: q.high ?? interpolatedClose,
            low: q.low ?? interpolatedClose,
            close: interpolatedClose,
            volume: q.volume ?? 0,
            // 補間データフラグ（UI表示用）
            isInterpolated: !hasValidClose,
          };
        });

        return NextResponse.json({ data: ohlcv, warning });
      } catch (innerError: unknown) {
        return handleApiError(new Error('Failed to fetch historical data'), 'market/history', 502);
      }
    }

    if (type === 'quote') {
      const symbols = symbol.split(',').map(s => formatSymbol(s.trim(), market || undefined));

      if (symbols.length === 1) {
        try {
          const result = await yf.quote(symbols[0]) as YahooQuoteResult;
          if (!result) throw new Error('Symbol not found');

          // Check if this is a Japanese stock and get market status
          let tseStatus;
          if (isJapaneseStock(symbols[0], market || undefined)) {
            tseStatus = isTSEOpen();
          }

          return NextResponse.json({
            symbol: symbol,
            price: result.regularMarketPrice,
            change: result.regularMarketChange,
            changePercent: result.regularMarketChangePercent,
            volume: result.regularMarketVolume,
            marketState: result.marketState,
            // Add TSE-specific status for Japanese stocks
            ...(tseStatus && {
              tseStatus: {
                isOpen: tseStatus.isOpen,
                message: getMarketStatusMessage(tseStatus),
                tradingSession: tseStatus.tradingSession,
                nextOpenTime: tseStatus.nextOpenTime ? formatNextOpenTime(tseStatus.nextOpenTime) : undefined,
              }
            })
          });
        } catch (quoteError: unknown) {
          return handleApiError(quoteError, 'market/quote', 404);
        }
      } else {
        try {
          const results = await yf.quote(symbols) as YahooQuoteResult[];
          const data = results
            .filter((r): r is YahooQuoteResult => !!r)
            .map(r => {
              let tseStatus;
              if (isJapaneseStock(r.symbol || '', market || undefined)) {
                tseStatus = isTSEOpen();
              }

              return {
                symbol: r.symbol ? r.symbol.replace('.T', '') : 'UNKNOWN',
                price: r.regularMarketPrice || 0,
                change: r.regularMarketChange || 0,
                changePercent: r.regularMarketChangePercent || 0,
                volume: r.regularMarketVolume || 0,
                marketState: r.marketState || 'UNKNOWN',
                // Add TSE-specific status for Japanese stocks
                ...(tseStatus && {
                  tseStatus: {
                    isOpen: tseStatus.isOpen,
                    message: getMarketStatusMessage(tseStatus),
                    tradingSession: tseStatus.tradingSession,
                    nextOpenTime: tseStatus.nextOpenTime ? formatNextOpenTime(tseStatus.nextOpenTime) : undefined,
                  }
                })
              };
            });
          return NextResponse.json({ data });
        } catch (batchError: unknown) {
          return handleApiError(batchError, 'market/batch-quote', 502);
        }
      }
    }

    return validationError('Invalid type parameter. Use "history" or "quote".', 'type');

  } catch (error: unknown) {
    return handleApiError(error, 'market/api', 500);
  }
}