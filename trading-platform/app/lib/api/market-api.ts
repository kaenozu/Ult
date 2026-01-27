
import { marketDataClient } from './marketDataClient';

export async function fetchDailyBars(symbol: string, market: 'japan' | 'usa' = 'japan') {
  return marketDataClient.fetchDailyBars(symbol);
}

export async function fetchQuotes(symbols: string[]) {
  return marketDataClient.fetchQuotes(symbols);
}

export async function fetchRSI(symbol: string) {
  return marketDataClient.fetchRSI(symbol);
}

export async function fetchSMA(symbol: string) {
  return marketDataClient.fetchSMA(symbol);
}

