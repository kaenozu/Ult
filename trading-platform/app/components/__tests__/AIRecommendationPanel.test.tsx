import { render, screen } from '@testing-library/react';
import { AIRecommendationPanel } from '../AIRecommendationPanel';
import { Signal } from '@/app/types';

describe('AIRecommendationPanel', () => {
  const createMockSignal = (overrides: Partial<Signal> = {}): Signal => ({
    symbol: 'TEST',
    type: 'BUY',
    confidence: 0.8,
    targetPrice: 100,
    stopLoss: 95,
    reason: 'Test signal',
    predictedChange: 5,
    predictionDate: new Date().toISOString(),
    ...overrides,
  });

  it('should render no recommendations message when empty', () => {
    render(<AIRecommendationPanel signals={[]} />);
    expect(screen.getByText('現在、高確信の推奨銘柄はありません')).toBeInTheDocument();
  });

  it('should render no recommendations for low confidence signals', () => {
    const signals: Signal[] = [
      createMockSignal({ confidence: 0.4 }),
    ];
    render(<AIRecommendationPanel signals={signals} />);
    expect(screen.getByText('現在、高確信の推奨銘柄はありません')).toBeInTheDocument();
  });

  it('should render high confidence signals', () => {
    const signals: Signal[] = [
      createMockSignal({ symbol: 'AAPL', confidence: 0.85, type: 'BUY', predictedChange: 5 }),
    ];
    render(<AIRecommendationPanel signals={signals} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
  });

  it('should rank signals by confidence', () => {
    const signals: Signal[] = [
      createMockSignal({ symbol: 'LOW', confidence: 0.75 }),
      createMockSignal({ symbol: 'HIGH', confidence: 0.95 }),
    ];
    render(<AIRecommendationPanel signals={signals} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('HIGH');
  });

  it('should limit displayed signals', () => {
    const signals: Signal[] = Array.from({ length: 10 }, (_, i) => 
      createMockSignal({ symbol: `TEST${i}`, confidence: 0.8 + i * 0.01 })
    );
    render(<AIRecommendationPanel signals={signals} maxItems={3} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('should call onSelectSignal when clicked', () => {
    const onSelectSignal = jest.fn();
    const signals: Signal[] = [
      createMockSignal({ symbol: 'AAPL', confidence: 0.85 }),
    ];
    render(<AIRecommendationPanel signals={signals} onSelectSignal={onSelectSignal} />);
    screen.getByRole('button').click();
    expect(onSelectSignal).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'AAPL' }));
  });
});
