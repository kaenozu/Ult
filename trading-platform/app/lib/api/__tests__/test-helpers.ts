/**
 * Test Utils for Data Aggregation Tests
 * Provides mock data generation and testing utilities
 */

import { OHLCV } from '@/app/types';

export function generateMockOHLCV(
  basePrice: number = 1000,
  days: number = 30,
  volatility: number = 0.02
): OHLCV[] {
  const data: OHLCV[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let currentPrice = basePrice;

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - (i * dayMs);
    
    // Generate random price movement
    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
    currentPrice = Math.max(currentPrice + change, basePrice * 0.5); // Prevent negative prices
    
    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * volatility * currentPrice;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      date: new Date(timestamp).toISOString().split('T')[0],
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }

  return data;
}

export function createMockAPIResponse(data: any, success: boolean = true) {
  return {
    ok: success,
    status: success ? 200 : 500,
    json: async () => success ? { data } : { error: 'API Error' }
  };
}

export function validateOHLCVStructure(data: OHLCV[]): boolean {
  if (!Array.isArray(data) || data.length === 0) return false;
  
  return data.every(item => 
    typeof item.open === 'number' &&
    typeof item.high === 'number' &&
    typeof item.low === 'number' &&
    typeof item.close === 'number' &&
    typeof item.volume === 'number' &&
    typeof item.timestamp === 'number' &&
    item.high >= item.low &&
    item.high >= item.open &&
    item.high >= item.close &&
    item.low <= item.open &&
    item.low <= item.close
  );
}

export function calculatePriceChange(data: OHLCV[]): { change: number; changePercent: number } {
  if (data.length < 2) return { change: 0, changePercent: 0 };
  
  const first = data[0].close;
  const last = data[data.length - 1].close;
  const change = last - first;
  const changePercent = (change / first) * 100;
  
  return { change, changePercent };
}