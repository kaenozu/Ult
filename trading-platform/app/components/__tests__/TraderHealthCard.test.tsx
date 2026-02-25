import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TraderHealthCard } from '../TraderHealthCard';

// Mock the psychology store
jest.mock('@/app/store/psychologyStore', () => ({
  usePsychologyStore: jest.fn(),
}));

import { usePsychologyStore } from '@/app/store/psychologyStore';

describe('TraderHealthCard Accessibility', () => {
  beforeEach(() => {
    // Default mock implementation
    (usePsychologyStore as unknown as jest.Mock).mockReturnValue({
      current_mental_health: {
        state: 'optimal',
        overall_score: 85,
        stress_level: 20,
        discipline_score: 90,
        risk_of_tilt: 0.1,
      },
      active_recommendations: [
        { message: 'Take a break' }
      ]
    });
  });

  it('renders with correct accessibility roles and labels', () => {
    render(<TraderHealthCard />);

    // Check for main region
    // The label might be "トレーダー・ヘルス" or similar
    const region = screen.getByRole('region', { name: /トレーダー・ヘルス/i });
    expect(region).toBeInTheDocument();

    // Check for progress bars
    const overallScore = screen.getByRole('progressbar', { name: /総合メンタルスコア/i });
    expect(overallScore).toBeInTheDocument();
    expect(overallScore).toHaveAttribute('aria-valuenow', '85');
    expect(overallScore).toHaveAttribute('aria-valuemin', '0');
    expect(overallScore).toHaveAttribute('aria-valuemax', '100');

    const stressLevel = screen.getByRole('progressbar', { name: /ストレス/i });
    expect(stressLevel).toBeInTheDocument();
    expect(stressLevel).toHaveAttribute('aria-valuenow', '20');

    const disciplineScore = screen.getByRole('progressbar', { name: /規律/i });
    expect(disciplineScore).toBeInTheDocument();
    expect(disciplineScore).toHaveAttribute('aria-valuenow', '90');
  });

  it('renders status with live region for announcements', () => {
    render(<TraderHealthCard />);

    const statusLabel = screen.getByText('最適');
    const statusContainer = statusLabel.closest('div');
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');
  });
});
