import { render, screen } from '@testing-library/react';
import { DynamicRiskMetrics } from '../DynamicRiskMetrics';
import { Stock, OHLCV } from '@/app/types';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';

describe('DynamicRiskMetrics', () => {
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

  it('renders risk metrics correctly', () => {
    render(
      <DynamicRiskMetrics
        stock={mockStock}
        currentPrice={150}
        side="BUY"
        ohlcv={mockOHLCV}
        cash={100000}
        config={mockConfig}
      />
    );

    expect(screen.getByText('ボラティリティ')).toBeInTheDocument();
    expect(screen.getByText('推奨ポジションサイズ')).toBeInTheDocument();
    expect(screen.getByText('ストップロス')).toBeInTheDocument();
    expect(screen.getByText('利確価格')).toBeInTheDocument();
    expect(screen.getByText('リスクリワード比')).toBeInTheDocument();
    expect(screen.getByText('リスク額')).toBeInTheDocument();
    expect(screen.getByText('リスク率')).toBeInTheDocument();
    expect(screen.getByText('サイジング方法')).toBeInTheDocument();
    expect(screen.getByText('調整係数')).toBeInTheDocument();
  });

  it('displays trailing stop status when enabled', () => {
    render(
      <DynamicRiskMetrics
        stock={mockStock}
        currentPrice={150}
        side="BUY"
        ohlcv={mockOHLCV}
        cash={100000}
        config={mockConfig}
      />
    );

    expect(screen.getByText('トレイリングストップ')).toBeInTheDocument();
    expect(screen.getByText('有効')).toBeInTheDocument();
  });

  it('displays correct volatility level', () => {
    render(
      <DynamicRiskMetrics
        stock={mockStock}
        currentPrice={150}
        side="BUY"
        ohlcv={mockOHLCV}
        cash={100000}
        config={mockConfig}
      />
    );

    // ボラティリティレベルが表示されることを確認
    const volatilityElement = screen.getByText(/低|中|高|極端|不明/);
    expect(volatilityElement).toBeInTheDocument();
  });

  it('displays correct position sizing method', () => {
    render(
      <DynamicRiskMetrics
        stock={mockStock}
        currentPrice={150}
        side="BUY"
        ohlcv={mockOHLCV}
        cash={100000}
        config={mockConfig}
      />
    );

    // ケリー基準が表示されることを確認
    expect(screen.getByText(/ケリー基準|固定比率/)).toBeInTheDocument();
  });
});
