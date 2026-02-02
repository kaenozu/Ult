import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccuracyBadge } from '../AccuracyBadge';

describe('AccuracyBadge', () => {
  it('should display high accuracy badge for hitRate >= 60', () => {
    render(<AccuracyBadge hitRate={65} totalTrades={100} />);
    
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('高精度')).toBeInTheDocument();
    expect(screen.getByText('100回分析')).toBeInTheDocument();
  });

  it('should display medium accuracy badge for hitRate >= 50 and < 60', () => {
    render(<AccuracyBadge hitRate={55} totalTrades={80} />);
    
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('中精度')).toBeInTheDocument();
    expect(screen.getByText('80回分析')).toBeInTheDocument();
  });

  it('should display low accuracy badge for hitRate < 50', () => {
    render(<AccuracyBadge hitRate={45} totalTrades={60} />);
    
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('低精度')).toBeInTheDocument();
    expect(screen.getByText('60回分析')).toBeInTheDocument();
  });

  it('should display loading state when loading is true', () => {
    render(<AccuracyBadge hitRate={0} totalTrades={0} loading={true} />);
    
    expect(screen.getByText('計算中...')).toBeInTheDocument();
  });

  it('should display data insufficient message when totalTrades is 0', () => {
    render(<AccuracyBadge hitRate={0} totalTrades={0} />);
    
    expect(screen.getByText('データ不足')).toBeInTheDocument();
  });

  it('should display prediction error when provided', () => {
    render(<AccuracyBadge hitRate={70} totalTrades={100} predictionError={0.15} />);
    
    expect(screen.getByText('予測誤差')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AccuracyBadge hitRate={60} totalTrades={50} className="custom-class" />
    );
    
    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });
});
