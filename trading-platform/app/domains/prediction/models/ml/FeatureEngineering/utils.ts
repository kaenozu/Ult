import { OHLCV, MacroEconomicFeatures, SentimentFeatures, DataQuality } from './types';

export function lastValue(arr: number[]): number {
  const validValues = arr.filter(v => !isNaN(v) && v !== 0);
  return validValues.length > 0 ? validValues[validValues.length - 1] : 0;
}

export function getDefaultMacroFeatures(): MacroEconomicFeatures {
  return {
    interestRate: 0,
    interestRateTrend: 'STABLE',
    gdpGrowth: 0,
    gdpTrend: 'STABLE',
    cpi: 0,
    cpiTrend: 'STABLE',
    inflationRate: 0,
    macroScore: 0,
  };
}

export function getDefaultSentimentFeatures(): SentimentFeatures {
  return {
    newsSentiment: 0,
    newsVolume: 0,
    newsTrend: 'STABLE',
    socialSentiment: 0,
    socialVolume: 0,
    socialBuzz: 0,
    analystRating: 3,
    ratingChange: 0,
    sentimentScore: 0,
  };
}

export function assessDataQuality(data: OHLCV[]): DataQuality {
  const dataPoints = data.length;
  const recentData = data.slice(-20);

  let missingDataCount = 0;
  for (const d of recentData) {
    if (d.high === 0 || d.low === 0 || d.close === 0 || d.volume === 0) {
      missingDataCount++;
    }
  }

  const missingDataRatio = missingDataCount / recentData.length;

  if (dataPoints >= 252 && missingDataRatio === 0) return 'EXCELLENT';
  if (dataPoints >= 100 && missingDataRatio < 0.05) return 'GOOD';
  if (dataPoints >= 50 && missingDataRatio < 0.2) return 'FAIR';
  return 'POOR';
}

export function countFeatures(
  technical: object,
  macro: object | null,
  sentiment: object | null,
  timeSeries: object
): number {
  let count = Object.keys(technical).length + Object.keys(timeSeries).length;
  if (macro) count += Object.keys(macro).length;
  if (sentiment) count += Object.keys(sentiment).length;
  return count;
}
