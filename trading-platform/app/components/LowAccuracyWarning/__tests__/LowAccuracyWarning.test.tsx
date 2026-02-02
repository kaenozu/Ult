import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LowAccuracyWarning } from '../LowAccuracyWarning';

describe('LowAccuracyWarning', () => {
  it('should display warning when hitRate is below threshold and signal is BUY', () => {
    render(
      <LowAccuracyWarning
        hitRate={45}
        symbolName="AAPL"
        signalType="BUY"
        threshold={50}
      />
    );
    
    expect(screen.getByText('⚠️ 低精度警告')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('45%', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('買いシグナル', { exact: false })).toBeInTheDocument();
  });

  it('should display warning when hitRate is below threshold and signal is SELL', () => {
    render(
      <LowAccuracyWarning
        hitRate={40}
        symbolName="TSLA"
        signalType="SELL"
        threshold={50}
      />
    );
    
    expect(screen.getByText('⚠️ 低精度警告')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
    expect(screen.getByText('40%', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('売りシグナル', { exact: false })).toBeInTheDocument();
  });

  it('should NOT display warning when hitRate is above threshold', () => {
    const { container } = render(
      <LowAccuracyWarning
        hitRate={60}
        symbolName="AAPL"
        signalType="BUY"
        threshold={50}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should NOT display warning when signal type is HOLD', () => {
    const { container } = render(
      <LowAccuracyWarning
        hitRate={40}
        symbolName="AAPL"
        signalType="HOLD"
        threshold={50}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should dismiss warning when close button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <LowAccuracyWarning
        hitRate={45}
        symbolName="AAPL"
        signalType="BUY"
        threshold={50}
        onDismiss={onDismiss}
      />
    );
    
    const closeButton = screen.getByLabelText('警告を閉じる');
    fireEvent.click(closeButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should use custom threshold when provided', () => {
    render(
      <LowAccuracyWarning
        hitRate={55}
        symbolName="AAPL"
        signalType="BUY"
        threshold={60}
      />
    );
    
    expect(screen.getByText('⚠️ 低精度警告')).toBeInTheDocument();
  });

  it('should display recommendation text', () => {
    render(
      <LowAccuracyWarning
        hitRate={45}
        symbolName="AAPL"
        signalType="BUY"
        threshold={50}
      />
    );
    
    expect(screen.getByText(/他のテクニカル指標やファンダメンタルズ分析/)).toBeInTheDocument();
  });
});
