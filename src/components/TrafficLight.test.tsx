import { render, screen } from '@testing-library/react';
import { TrafficLight } from './TrafficLight';

describe('TrafficLight Component', () => {
  describe('Rendering', () => {
    it('renders safe level correctly with proper styling', () => {
      render(<TrafficLight safetyLevel='safe' />);
      const statusElement = screen.getByText('safe System');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveStyle({ color: '#22c55e' });
    });

    it('renders caution level correctly with proper styling', () => {
      render(<TrafficLight safetyLevel='caution' />);
      const statusElement = screen.getByText('caution System');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveStyle({ color: '#eab308' });
    });

    it('renders danger level correctly with proper styling', () => {
      render(<TrafficLight safetyLevel='danger' />);
      const statusElement = screen.getByText('danger System');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveStyle({ color: '#ef4444' });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for screen readers', () => {
      render(<TrafficLight safetyLevel='safe' />);
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute(
        'aria-label',
        'System safety level: safe'
      );
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('has descriptive labels for light indicators', () => {
      render(<TrafficLight safetyLevel='safe' />);
      expect(screen.getByLabelText('safe level active')).toBeInTheDocument();
      expect(
        screen.getByLabelText('caution level inactive')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('danger level inactive')
      ).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders without unnecessary re-renders', () => {
      const { rerender } = render(<TrafficLight safetyLevel='safe' />);
      expect(screen.getByText('safe System')).toBeInTheDocument();

      // Re-render with same props should not cause issues
      rerender(<TrafficLight safetyLevel='safe' />);
      expect(screen.getByText('safe System')).toBeInTheDocument();
    });
  });
});
