import { render, screen } from '@testing-library/react';
import { SignalFilterView } from '../SignalPanel/SignalFilterView';
import { Signal } from '@/app/types';

describe('SignalFilterView', () => {
  const mockSignal: Signal = {
    symbol: 'AAPL',
    type: 'BUY',
    confidence: 75,
    targetPrice: 150,
    stopLoss: 140,
    reason: 'Test signal',
    predictedChange: 5,
    predictionDate: '2026-01-30',
    filterReasons: [],
  };

  it('renders all filters passed message when no filter reasons', () => {
    render(<SignalFilterView signal={mockSignal} />);
    expect(screen.getByText('全フィルタ通過')).toBeInTheDocument();
    expect(screen.getByText('このシグナルはすべてのフィルタ条件を満たしています')).toBeInTheDocument();
  });

  it('renders filter status with reasons', () => {
    const signalWithFilters: Signal = {
      ...mockSignal,
      filterReasons: [
        'ボリューム確認: 1000000 (平均の1.5倍)',
        'トレンド確認: 価格(145) >= SMA20(142) >= SMA50(140)',
        'ADXトレンド確認: ADX(30.5), +DI(25.3) > -DI(20.1)',
        'Stochastic確認: %K(18.5) が %D(15.2)をゴールデンクロス（売られすぎ領域）',
        'Williams %R確認: -85.2（売られすぎ領域）',
      ],
    };

    render(<SignalFilterView signal={signalWithFilters} />);
    expect(screen.getByText('フィルタスコア: 30/30')).toBeInTheDocument();
    expect(screen.getByText('高品質シグナル')).toBeInTheDocument();
  });

  it('renders partial filter status', () => {
    const signalWithPartialFilters: Signal = {
      ...mockSignal,
      filterReasons: [
        'ボリューム確認: 1000000 (平均の1.5倍)',
        'トレンド不一致: 価格(145) < SMA20(150) または SMA20 < SMA50(155)',
        'ADXトレンド確認: ADX(30.5), +DI(25.3) > -DI(20.1)',
      ],
    };

    render(<SignalFilterView signal={signalWithPartialFilters} />);
    expect(screen.getByText('フィルタスコア: 15/30')).toBeInTheDocument();
    expect(screen.getByText('注意が必要')).toBeInTheDocument();
  });

  it('displays correct filter names', () => {
    const signalWithFilters: Signal = {
      ...mockSignal,
      filterReasons: [
        'ボリューム確認: 1000000 (平均の1.5倍)',
        'トレンド確認: 価格(145) >= SMA20(142) >= SMA50(140)',
        'ADXトレンド確認: ADX(30.5), +DI(25.3) > -DI(20.1)',
        'Stochastic確認: %K(18.5) が %D(15.2)をゴールデンクロス（売られすぎ領域）',
        'Williams %R確認: -85.2（売られすぎ領域）',
      ],
    };

    render(<SignalFilterView signal={signalWithFilters} />);
    expect(screen.getByText('ボリューム')).toBeInTheDocument();
    expect(screen.getByText('トレンド (SMA)')).toBeInTheDocument();
    expect(screen.getByText('ADX (トレンド強度)')).toBeInTheDocument();
    expect(screen.getByText('Stochastic')).toBeInTheDocument();
    expect(screen.getByText('Williams %R')).toBeInTheDocument();
  });

  it('displays correct scores for each filter', () => {
    const signalWithFilters: Signal = {
      ...mockSignal,
      filterReasons: [
        'ボリューム確認: 1000000 (平均の1.5倍)',
        'トレンド確認: 価格(145) >= SMA20(142) >= SMA50(140)',
        'ADXトレンド確認: ADX(30.5), +DI(25.3) > -DI(20.1)',
        'Stochastic確認: %K(18.5) が %D(15.2)をゴールデンクロス（売られすぎ領域）',
        'Williams %R確認: -85.2（売られすぎ領域）',
      ],
    };

    render(<SignalFilterView signal={signalWithFilters} />);
    expect(screen.getByText('+5')).toBeInTheDocument(); // Volume
    expect(screen.getByText('+10')).toBeInTheDocument(); // ADX
  });
});
