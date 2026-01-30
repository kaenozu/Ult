import { render, screen } from '@testing-library/react';
import { RiskDashboard } from '../RiskDashboard';
import { Stock, OHLCV } from '@/app/types';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';

// Mock the portfolio store
jest.mock('@/app/store/portfolioStore', () => ({
  usePortfolioStore: jest.fn((selector) => selector({
    portfolio: {
      cash: 100000,
      positions: [],
      totalValue: 100000,
      totalProfit: 0,
      dailyPnL: 0,
      orders: [],
    },
  })),
}));

describe('RiskDashboard', () => {
  const mockStock: Stock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'usa',
    sector: 'Technology',
    price: 150,
    change: 2.5,
    changePercent: 1.69,
    volume: 1000000,
  };

  const mockOHLCV: OHLCV[] = [
    { date: '2026-01-01', open: 145, high: 150, low: 144, close: 148, volume: 1000000 },
    { date: '2026-01-02', open: 148, high: 152, low: 147, close: 150, volume: 1200000 },
    { date: '2026-01-03', open: 150, high: 155, low: 149, close: 152, volume: 1100000 },
    { date: '2026-01-04', open: 152, high: 156, low: 151, close: 154, volume: 1300000 },
    { date: '2026-01-05', open: 154, high: 158, low: 153, close: 156, volume: 1400000 },
    { date: '2026-01-06', open: 156, high: 160, low: 155, close: 158, volume: 1500000 },
    { date: '2026-01-07', open: 158, high: 162, low: 157, close: 160, volume: 1600000 },
    { date: '2026-01-08', open: 160, high: 164, low: 159, close: 162, volume: 1700000 },
    { date: '2026-01-09', open: 162, high: 166, low: 161, close: 164, volume: 1800000 },
    { date: '2026-01-10', open: 164, high: 168, low: 163, close: 166, volume: 1900000 },
    { date: '2026-01-11', open: 166, high: 170, low: 165, close: 168, volume: 2000000 },
    { date: '2026-01-12', open: 168, high: 172, low: 167, close: 170, volume: 2100000 },
    { date: '2026-01-13', open: 170, high: 174, low: 169, close: 172, volume: 2200000 },
    { date: '2026-01-14', open: 172, high: 176, low: 171, close: 174, volume: 2300000 },
    { date: '2026-01-15', open: 174, high: 178, low: 173, close: 176, volume: 2400000 },
  ];

  const mockConfig: DynamicRiskConfig = {
    enableTrailingStop: true,
    trailingStopATRMultiple: 2.0,
    trailingStopMinPercent: 1.0,
    enableVolatilityAdjustment: true,
    volatilityMultiplier: 1.5,
    enableDynamicPositionSizing: true,
    maxRiskPerTrade: 2.0,
    minRiskRewardRatio: 2.0,
  };

  it('renders risk dashboard title', () => {
    render(
      <RiskDashboard
        stock={mockStock}
        currentPrice={150}
        ohlcv={mockOHLCV}
        config={mockConfig}
      />
    );

    expect(screen.getByText('リスクダッシュボード')).toBeInTheDocument();
  });

  it('renders volatility level badge', () => {
    render(
      <RiskDashboard
        stock={mockStock}
        currentPrice={150}
        ohlcv={mockOHLCV}
        config={mockConfig}
      />
    );

    expect(screen.getByText(/ボラティリティ:/)).toBeInTheDocument();
  });

  it('renders all risk metrics', () => {
    render(
      <RiskDashboard
        stock={mockStock}
        currentPrice={150}
        ohlcv={mockOHLCV}
        config={mockConfig}
      />
    );

    expect(screen.getByText('推奨ポジションサイズ')).toBeInTheDocument();
    expect(screen.getByText('リスク額')).toBeInTheDocument();
    expect(screen.getByText('ストップロス')).toBeInTheDocument();
    expect(screen.getByText('利確価格')).toBeInTheDocument();
    expect(screen.getByText('リスクリワード比')).toBeInTheDocument();
  });

  it('renders position sizing method', () => {
    render(
      <RiskDashboard
        stock={mockStock}
        currentPrice={150}
        ohlcv={mockOHLCV}
        config={mockConfig}
      />
    );

    expect(screen.getByText('サイジング方法')).toBeInTheDocument();
    expect(screen.getByText(/ケリー基準|固定比率/)).toBeInTheDocument();
  });

  it('renders adjustment factor with progress bar', () => {
    render(
      <RiskDashboard
        stock={mockStock}
        currentPrice={150}
        ohlcv={mockOHLCV}
        config={mockConfig}
      />
    );

    expect(screen.getByText('ボラティリティ調整係数')).toBeInTheDocument();
  });

  it('renders recommended risk percentage with progress bar', () => {
    render(
      <RiskDashboard
        stock={mockStock}
        currentPrice={150}
        ohlcv={mockOHLCV}
        config={mockConfig}
      />
    );

    expect(screen.getByText('推奨リスク率')).toBeInTheDocument();
    expect(screen.getByText('最大2%を推奨')).toBeInTheDocument();
  });
});
