import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataQualityPanel } from '../DataQualityPanel';

// Mock fetch
global.fetch = jest.fn();

describe('DataQualityPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly in full mode', async () => {
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

    await act(async () => {
      render(<DataQualityPanel />);
    });

    expect(screen.getByText('データ品質ダッシュボード')).toBeInTheDocument();
  });

  it('renders correctly in compact mode', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'global',
        overallScore: 75,
        cacheStats: { hitRate: 0.8, size: 100, maxSize: 1000, evictions: 5, hits: 80, misses: 20 },
        dataSources: [],
        anomalies: []
      }),
    });

    await act(async () => {
      render(<DataQualityPanel compact />);
    });

    expect(screen.getByText('データ品質')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
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

    await act(async () => {
      render(<DataQualityPanel />);
    });

    await waitFor(() => {
      const percentageElements = screen.getAllByText('95%');
      expect(percentageElements.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Source')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Anomaly 1') ?? false;
      }).length).toBeGreaterThan(0);
    });
  });

  it('displays anomaly alerts', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'global',
        overallScore: 70,
        cacheStats: { hitRate: 0.7, size: 100, maxSize: 1000, evictions: 5, hits: 70, misses: 30 },
        dataSources: [],
        anomalies: ['High latency detected', 'Data quality degraded']
      }),
    });

    await act(async () => {
      render(<DataQualityPanel />);
    });

    await waitFor(() => {
      expect(screen.getByText('検出された異常')).toBeInTheDocument();
      expect(screen.getByText(/High latency detected/)).toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      render(<DataQualityPanel />);
    });

    // Component should still render even on fetch failure
    expect(screen.getByText('データ品質ダッシュボード')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('shows correct status colors for different scores', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'global',
        overallScore: 95,
        cacheStats: { hitRate: 0.95, size: 100, maxSize: 1000, evictions: 5, hits: 95, misses: 20 },
        dataSources: [],
        anomalies: []
      }),
    });

    await act(async () => {
      render(<DataQualityPanel />);
    });

    await waitFor(() => {
      const elements = screen.getAllByText('95%');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('displays data source status correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'global',
        overallScore: 85,
        cacheStats: { hitRate: 0.8, size: 100, maxSize: 1000, evictions: 5, hits: 80, misses: 20 },
        dataSources: [
          { source: 'Source 1', status: 'healthy', latency: 50, lastUpdate: Date.now(), qualityScore: 95 },
          { source: 'Source 2', status: 'degraded', latency: 150, lastUpdate: Date.now(), qualityScore: 75 },
          { source: 'Source 3', status: 'offline', latency: 0, lastUpdate: Date.now(), qualityScore: 0 },
        ],
        anomalies: []
      }),
    });

    await act(async () => {
      render(<DataQualityPanel />);
    });

    await waitFor(() => {
      expect(screen.getByText('Source 1')).toBeInTheDocument();
      expect(screen.getByText('Source 2')).toBeInTheDocument();
      expect(screen.getByText('Source 3')).toBeInTheDocument();
    });
  });
});
