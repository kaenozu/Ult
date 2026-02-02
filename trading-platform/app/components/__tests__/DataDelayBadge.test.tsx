/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataDelayBadge } from '../DataDelayBadge';

describe('DataDelayBadge', () => {
  it('should render delay badge for Japanese market', () => {
    render(<DataDelayBadge market="japan" />);
    
    expect(screen.getByText('遅延20分')).toBeInTheDocument();
  });

  it('should render delay badge with custom delay minutes', () => {
    render(<DataDelayBadge market="japan" delayMinutes={15} />);
    
    expect(screen.getByText('遅延15分')).toBeInTheDocument();
  });

  it('should show fallback badge when fallback is applied', () => {
    render(<DataDelayBadge market="japan" fallbackApplied={true} />);
    
    expect(screen.getByText('日足のみ')).toBeInTheDocument();
  });

  it('should not render for USA market', () => {
    const { container } = render(<DataDelayBadge market="usa" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render both badges when fallback is applied', () => {
    render(<DataDelayBadge market="japan" fallbackApplied={true} delayMinutes={20} />);
    
    expect(screen.getByText('遅延20分')).toBeInTheDocument();
    expect(screen.getByText('日足のみ')).toBeInTheDocument();
  });

  it('should render small size variant', () => {
    const { container } = render(<DataDelayBadge market="japan" size="sm" />);
    
    // Find the inner badge div with text-[10px]
    const badge = container.querySelector('.text-\\[10px\\]');
    expect(badge).toBeInTheDocument();
  });

  it('should render medium size variant by default', () => {
    const { container } = render(<DataDelayBadge market="japan" />);
    
    // Find the inner badge div with text-xs
    const badge = container.querySelector('.text-xs');
    expect(badge).toBeInTheDocument();
  });

  it('should have appropriate title attribute for accessibility', () => {
    render(<DataDelayBadge market="japan" />);
    
    const badge = screen.getByText('遅延20分').closest('div');
    expect(badge).toHaveAttribute('title');
    expect(badge?.getAttribute('title')).toContain('20 minute delay');
  });

  it('should have fallback warning title when fallback applied', () => {
    render(<DataDelayBadge market="japan" fallbackApplied={true} />);
    
    const fallbackBadge = screen.getByText('日足のみ').closest('div');
    expect(fallbackBadge).toHaveAttribute('title');
    expect(fallbackBadge?.getAttribute('title')).toContain('分足データが利用できない');
  });
});
