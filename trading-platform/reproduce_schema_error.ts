
import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';

// --- Copied Schemas from app/lib/schemas/market.ts ---

export const YahooQuoteSchema = z.object({
    date: z.union([z.date(), z.string()]),
    open: z.number().nullable().optional(),
    high: z.number().nullable().optional(),
    low: z.number().nullable().optional(),
    close: z.number().nullable().optional(),
    volume: z.number().nullable().optional(),
    adjclose: z.number().optional(),
}).passthrough();

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
    timestamp: z.array(z.number()).optional(),
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

// --- Reproduction Logic ---

async function main() {
    try {
        const symbol = '7203.T';
        console.log(`Fetching data for ${symbol}...`);
        const result = await yahooFinance.chart(symbol, { period1: '2023-01-01', interval: '1d' });

        // Validate
        const parseResult = YahooChartResultSchema.safeParse(result);

        if (parseResult.success) {
            console.log('Validation SUCCESS!');
        } else {
            console.error('Validation FAILED!');
            console.error(JSON.stringify(parseResult.error.format(), null, 2));
        }

    } catch (error) {
        console.error('Error in script:', error);
    }
}

main();
