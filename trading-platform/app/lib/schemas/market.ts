import { z } from 'zod';

// --- Yahoo Finance Schemas ---

export const YahooQuoteSchema = z.object({
  date: z.union([z.date(), z.string()]),
  open: z.number().nullable().optional(),
  high: z.number().nullable().optional(),
  low: z.number().nullable().optional(),
  close: z.number().nullable().optional(),
  volume: z.number().nullable().optional(),
  adjclose: z.number().optional(),
}).passthrough(); // Allow extra properties

export const YahooChartMetaSchema = z.object({
  currency: z.string().optional(),
  symbol: z.string(),
  regularMarketPrice: z.number().optional(),
  exchangeName: z.string().optional(),
  instrumentType: z.string().optional(),
  firstTradeDate: z.union([z.number(), z.null()]).optional(),
  regularMarketTime: z.number().optional(),
  gmtoffset: z.number().optional(),
  timezone: z.string().optional(),
  exchangeTimezoneName: z.string().optional(),
  regularMarketPriceHint: z.number().optional(),
  currentTradingPeriod: z.any().optional(),
  dataGranularity: z.string().optional(),
  range: z.string().optional(),
  validRanges: z.array(z.string()).optional(),
}).passthrough();

export const YahooChartResultSchema = z.object({
  meta: YahooChartMetaSchema,
  quotes: z.array(YahooQuoteSchema).optional(),
  timestamp: z.array(z.number()).optional(), // Yahoo sometimes returns separate arrays
  indicators: z.object({
    quote: z.array(z.object({
      high: z.array(z.number().nullable().optional()),
      low: z.array(z.number().nullable().optional()),
      open: z.array(z.number().nullable().optional()),
      close: z.array(z.number().nullable().optional()),
      volume: z.array(z.number().nullable().optional()),
    })).optional(),
    adjclose: z.array(z.object({
        adjclose: z.array(z.number().nullable().optional())
    })).optional()
  }).optional()
}).passthrough();

export const YahooSingleQuoteSchema = z.object({
  symbol: z.string(),
  regularMarketPrice: z.number().optional(),
  regularMarketChange: z.number().optional(),
  regularMarketChangePercent: z.number().optional(),
  regularMarketVolume: z.number().optional(),
  marketState: z.string().optional(),
  longName: z.string().optional(),
  shortName: z.string().optional(),
}).passthrough();

// Yahoo Finance return type is often { chart: { result: [...] } } or just the result depending on the library wrapper
// yahoo-finance2 chart() returns the result object directly (YahooChartResult)

export type YahooChartResult = z.infer<typeof YahooChartResultSchema>;
export type YahooSingleQuoteResult = z.infer<typeof YahooSingleQuoteSchema>;

// --- Internal Market API Schemas ---

export const OHLCVSchema = z.object({
  symbol: z.string().optional(), // Sometimes added by service
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  isInterpolated: z.boolean().optional(),
});

export type OHLCV = z.infer<typeof OHLCVSchema>;

export const MarketHistoryMetadataSchema = z.object({
  source: z.string().optional(),
  isJapaneseStock: z.boolean().optional(),
  dataDelayMinutes: z.number().optional(),
  interval: z.string().optional(),
  requestedInterval: z.string().optional(),
  fallbackApplied: z.boolean().optional(),
  isRealtime: z.boolean().optional(),
  quality: z.string().optional(),
  limitations: z.record(z.string(), z.unknown()).optional(),
});

export const MarketHistoryResponseSchema = z.object({
  data: z.array(OHLCVSchema),
  warnings: z.array(z.string()).optional(),
  metadata: MarketHistoryMetadataSchema.optional(),
  error: z.string().optional(), // In case of error response
});

export type MarketHistoryResponse = z.infer<typeof MarketHistoryResponseSchema>;

// Quote Schema for /api/market?type=quote
export const QuoteSchema = z.object({
  symbol: z.string(),
  price: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  volume: z.number().optional(),
  marketState: z.string().optional(),
});

export type Quote = z.infer<typeof QuoteSchema>;
