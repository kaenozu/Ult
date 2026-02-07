/**
 * SentimentPanel.tsx
 * 
 * センチメント分析パネル - ニュースとソーシャルメディアのセンチメントを表示
 * Sentiment Analysis Panel - Displays news and social media sentiment
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface SentimentData {
  symbol: string;
  overallScore: number;
  overallMagnitude: number;
  confidence: number;
  trend: 'improving' | 'worsening' | 'stable';
  volume: number;
  newsCount: number;
  socialCount: number;
  sources: {
    news: { score: number; magnitude: number; confidence: number; label: string };
    social: { score: number; magnitude: number; confidence: number; label: string };
    analyst: { score: number; magnitude: number; confidence: number; label: string };
  };
  entities: string[];
  topics: string[];
}

interface SentimentPanelProps {
  symbol: string;
}

// ============================================================================
// Component
// ============================================================================

export function SentimentPanel({ symbol }: SentimentPanelProps) {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentimentData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sentiment/${symbol}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('No sentiment data available for this symbol');
          setSentimentData(null);
          return;
        }
        throw new Error('Failed to fetch sentiment data');
      }

      const result = await response.json();
      setSentimentData(result.data);
    } catch (err) {
      console.error('Error fetching sentiment:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchSentimentData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSentimentData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSentimentData]);

  const getSentimentColor = (score: number): string => {
    if (score > 0.6) return 'text-green-600 dark:text-green-400';
    if (score > 0.2) return 'text-green-500 dark:text-green-500';
    if (score < -0.6) return 'text-red-600 dark:text-red-400';
    if (score < -0.2) return 'text-red-500 dark:text-red-500';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getSentimentLabel = (score: number): string => {
    if (score > 0.6) return 'Very Positive';
    if (score > 0.2) return 'Positive';
    if (score < -0.6) return 'Very Negative';
    if (score < -0.2) return 'Negative';
    return 'Neutral';
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'worsening':
        return '📉';
      default:
        return '➡️';
    }
  };

  if (loading && !sentimentData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading sentiment data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button
            onClick={fetchSentimentData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!sentimentData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          No sentiment data available for {symbol}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sentiment Analysis
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{symbol}</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getSentimentColor(sentimentData.overallScore)}`}>
              {getSentimentLabel(sentimentData.overallScore)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {getTrendIcon(sentimentData.trend)} {sentimentData.trend}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Score
          </span>
          <span className={`text-lg font-bold ${getSentimentColor(sentimentData.overallScore)}`}>
            {sentimentData.overallScore.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              sentimentData.overallScore > 0 ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{
              width: `${Math.abs(sentimentData.overallScore) * 50 + 50}%`,
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Confidence:</span>{' '}
            <span className="font-semibold">{(sentimentData.confidence * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Magnitude:</span>{' '}
            <span className="font-semibold">{sentimentData.overallMagnitude.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Volume:</span>{' '}
            <span className="font-semibold">{sentimentData.volume}</span>
          </div>
        </div>
      </div>

      {/* Sources Breakdown */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Source Breakdown
        </h4>
        <div className="space-y-3">
          {/* News */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                News ({sentimentData.newsCount} articles)
              </span>
              <span className={`text-sm font-semibold ${getSentimentColor(sentimentData.sources.news.score)}`}>
                {sentimentData.sources.news.label}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  sentimentData.sources.news.score > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.abs(sentimentData.sources.news.score) * 50 + 50}%`,
                }}
              />
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Social ({sentimentData.socialCount} posts)
              </span>
              <span className={`text-sm font-semibold ${getSentimentColor(sentimentData.sources.social.score)}`}>
                {sentimentData.sources.social.label}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  sentimentData.sources.social.score > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.abs(sentimentData.sources.social.score) * 50 + 50}%`,
                }}
              />
            </div>
          </div>

          {/* Analyst */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Analyst
              </span>
              <span className={`text-sm font-semibold ${getSentimentColor(sentimentData.sources.analyst.score)}`}>
                {sentimentData.sources.analyst.label}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  sentimentData.sources.analyst.score > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.abs(sentimentData.sources.analyst.score) * 50 + 50}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Entities and Topics */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Entities */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Key Entities
            </h4>
            <div className="flex flex-wrap gap-1">
              {sentimentData.entities.slice(0, 5).map((entity, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                >
                  {entity}
                </span>
              ))}
              {sentimentData.entities.length > 5 && (
                <span className="px-2 py-1 text-gray-600 dark:text-gray-400 text-xs">
                  +{sentimentData.entities.length - 5} more
                </span>
              )}
            </div>
          </div>

          {/* Topics */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Topics
            </h4>
            <div className="flex flex-wrap gap-1">
              {sentimentData.topics.slice(0, 5).map((topic, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded"
                >
                  {topic}
                </span>
              ))}
              {sentimentData.topics.length > 5 && (
                <span className="px-2 py-1 text-gray-600 dark:text-gray-400 text-xs">
                  +{sentimentData.topics.length - 5} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentimentPanel;
