import { getAPIClient } from './APIClient';
import { marketDataClient } from './marketDataClient';
import { parseOHLCVFromTimeSeries, parseIndicatorFromData } from './parsers';

export async function fetchDailyBars(symbol: string, market: 'japan' | 'usa' = 'japan') {
  return marketDataClient.fetchDailyBars(symbol);
}

export async function fetchQuotes(symbols: string[]): Promise<any[]> {
  return marketDataClient.fetchQuotes(symbols);
}

export async function fetchRSI(symbol: string): Promise<any> {
  return marketDataClient.fetchRSI(symbol);
}

export async function fetchSMA(symbol: string): Promise<any> {
  return marketDataClient.fetchSMA(symbol);
}

export function parseOHLCVFromTimeSeries(data: Record<string, unknown>, keyName: string) {
  return parseOHLCVFromTimeSeries(data, keyName);
}

export function parseIndicatorFromData(data: Record<string, unknown>, keyName: string) {
  return parseIndicatorFromData(data, keyName);
}
