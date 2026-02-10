import {
    isIntradayResponse,
    extractIntradayTimeSeries,
    isAlphaVantageError,
    AlphaVantageTimeSeriesIntraday
} from '../types';

describe('Type Guards and Extractors', () => {
    describe('isIntradayResponse', () => {
        it('returns true for valid intraday response', () => {
            const data = {
                'Meta Data': { '1. Information': 'Intraday' },
                'Time Series (5min)': {}
            };
            expect(isIntradayResponse(data)).toBe(true);
        });

        it('returns false for null', () => {
            expect(isIntradayResponse(null)).toBe(false);
        });

        it('returns false for non-object', () => {
            expect(isIntradayResponse('string')).toBe(false);
        });

        it('returns false if Meta Data is missing', () => {
            expect(isIntradayResponse({ 'Time Series': {} })).toBe(false);
        });

        it('returns false if Meta Data is not an object', () => {
            expect(isIntradayResponse({ 'Meta Data': 'string' })).toBe(false);
        });
    });

    describe('isAlphaVantageError', () => {
        it('returns true for error message', () => {
            expect(isAlphaVantageError({ 'Error Message': 'Error' })).toBe(true);
        });

        it('returns true for note', () => {
            expect(isAlphaVantageError({ 'Note': 'API limit reached' })).toBe(true);
        });

        it('returns true for information', () => {
            expect(isAlphaVantageError({ 'Information': 'Info' })).toBe(true);
        });

        it('returns false for valid data', () => {
            expect(isAlphaVantageError({ 'Meta Data': {} })).toBe(false);
        });

        it('returns false for null', () => {
            expect(isAlphaVantageError(null)).toBe(false);
        });
    });

    describe('extractIntradayTimeSeries', () => {
        it('extracts data matching the interval', () => {
            const data: AlphaVantageTimeSeriesIntraday = {
                'Meta Data': {} as Record<string, unknown>,
                'Time Series (5min)': {
                    '2023-01-01 10:00:00': {
                        '1. open': '100',
                        '2. high': '105',
                        '3. low': '95',
                        '4. close': '102',
                        '5. volume': '1000'
                    }
                } as Record<string, unknown>
            };

            const result = extractIntradayTimeSeries(data, '5min');
            expect(result).toBeDefined();
            expect(result?.['2023-01-01 10:00:00']['1. open']).toBe('100');
        });

        it('returns undefined if interval matches but value is null', () => {
            // Just covering the branch `if (typeof value === 'object' && value !== null)`
            const data: Record<string, unknown> = {
                'Meta Data': {},
                'Time Series (5min)': null
            };
            expect(extractIntradayTimeSeries(data, '5min')).toBeUndefined();
        });

        it('returns undefined if interval does not match', () => {
            const data: AlphaVantageTimeSeriesIntraday = {
                'Meta Data': {} as Record<string, unknown>,
                'Time Series (1min)': {} as Record<string, unknown>
            };
            expect(extractIntradayTimeSeries(data, '5min')).toBeUndefined();
        });
    });

    describe('Error Classes', () => {
        // Import classes from the correct location
        const { ApiError: APIError, NetworkError, ValidationError, RateLimitError } = require('../lib/errors');

        it('APIError sets properties correctly', () => {
            const err = new APIError('msg', 'CODE', 400, { data: 1 });
            expect(err.message).toBe('msg');
            expect(err.code).toBe('CODE');
            expect(err.statusCode).toBe(400);
            expect(err.details).toMatchObject({ data: 1 });
            expect(err.name).toBe('ApiError'); // Implementation uses ApiError
        });

        it('NetworkError defaults', () => {
            const err = new NetworkError('net err');
            expect(err.code).toBe('NETWORK_ERROR');
            expect(err.name).toBe('NetworkError');
        });

        it('ValidationError defaults', () => {
            // New signature: (field, message)
            const err = new ValidationError('field1', 'inv');
            expect(err.code).toBe('VALIDATION_ERROR');
            expect(err.statusCode).toBe(400);
            expect(err.details).toMatchObject({ field: 'field1' });
            expect(err.name).toBe('ValidationError');
        });

        it('RateLimitError defaults', () => {
            const err = new RateLimitError();
            expect(err.code).toBe('RATE_LIMIT_ERROR');
            expect(err.statusCode).toBe(429);
            expect(err.name).toBe('RateLimitError');
        });
    });
});
