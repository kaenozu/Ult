export function generateSignalReason(signal: any): string {
  if (!signal) return '';
  if (signal.reason) return signal.reason;

  // Fallback generation based on signal properties
  if (signal.type === 'BUY') {
    return `Strong buy signal detected with confidence ${signal.confidence}%`;
  }
  if (signal.type === 'SELL') {
    return `Sell signal detected with confidence ${signal.confidence}%`;
  }

  return 'Market conditions analyzed';
}
