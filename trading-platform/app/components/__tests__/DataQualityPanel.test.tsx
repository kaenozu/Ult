import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataQualityPanel } from '../DataQualityPanel';

// Mock fetch
global.fetch = jest.fn();

describe('DataQualityPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'global',
        overallScore: 85,
        cacheStats: { hitRate: 0.8, size: 100, maxSize: 1000, evictions: 5, hits: 80, misses: 20 },
        dataSources: [],
        anomalies: []
      }),
    });

    render(<DataQualityPanel />);
    expect(screen.getByText('データ品質ダッシュボード')).toBeInTheDocument();
  });

  it('displays data after fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'global',
        overallScore: 95,
        cacheStats: { hitRate: 0.95, size: 500, maxSize: 1000, evictions: 10, hits: 95, misses: 5 },
        dataSources: [
            { source: 'Test Source', status: 'healthy', latency: 50, lastUpdate: Date.now(), qualityScore: 100 }
        ],
        anomalies: ['Anomaly 1']
      }),
    });

    render(<DataQualityPanel />);

    const percentageElements = await screen.findAllByText('95%');
    expect(percentageElements.length).toBeGreaterThan(0);

    await waitFor(() => {
        expect(screen.getByText('Test Source')).toBeInTheDocument();
    });

    expect(screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Anomaly 1') ?? false;
    }).length).toBeGreaterThan(0);
  });
});
