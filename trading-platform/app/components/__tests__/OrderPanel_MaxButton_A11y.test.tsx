/**
 * OrderPanel Max Button Accessibility Tests
 * 
 * These tests verify the accessibility improvements for the Max button
 * as implemented in PR #938:
 * - aria-disabled instead of disabled attribute for keyboard focusability
 * - onFocus/onBlur handlers for tooltip visibility
 * - aria-describedby for semantic linkage to tooltip
 * - focus:ring styles for visual focus indicator
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';

jest.mock('@/app/store/portfolioStore');

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('OrderPanel Max Button - Accessibility (PR #938)', () => {
  const mockStock = { 
    symbol: '7203', 
    name: 'Toyota', 
    price: 2000, 
    change: 0, 
    changePercent: 0, 
    market: 'japan' as const, 
    sector: 'Automotive', 
    volume: 1000000 
  };
  const mockExecuteOrder = jest.fn();

  describe('When user can afford (sufficient funds)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          portfolio: { cash: 1000000, positions: [] },
          executeOrder: mockExecuteOrder,
        };
        return selector ? selector(state) : state;
      });
    });

    it('button should be clickable and set quantity', () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      expect(maxButton).not.toHaveAttribute('disabled');
      
      fireEvent.click(maxButton);
      
      const input = screen.getByLabelText('数量') as HTMLInputElement;
      expect(input.value).toBe('500'); // 1,000,000 / 2,000 = 500
    });

    it('should not have aria-disabled attribute', () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      expect(maxButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('should not show tooltip on focus', () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      fireEvent.focus(maxButton);
      
      const tooltip = screen.queryByRole('tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });
  });

  describe('When user cannot afford (insufficient funds)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          portfolio: { cash: 100, positions: [] }, // Only 100 cash, not enough for 2000 price
          executeOrder: mockExecuteOrder,
        };
        return selector ? selector(state) : state;
      });
    });

    it('button should NOT have disabled attribute (keyboard focusable)', () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      
      // Key assertion: button should NOT have disabled attribute
      // This allows keyboard users to focus on it
      expect(maxButton).not.toHaveAttribute('disabled');
    });

    it('button should have aria-disabled="true" attribute', () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      
      // Should use aria-disabled instead of disabled
      expect(maxButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('button should be focusable via keyboard', () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/) as HTMLButtonElement;
      
      // Verify button can receive focus
      maxButton.focus();
      expect(maxButton).toHaveFocus();
    });

    it('tooltip should appear on focus (keyboard accessibility)', async () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      
      // Focus on the button (keyboard interaction)
      fireEvent.focus(maxButton);
      
      // Tooltip should appear
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent('現金が足りません');
      });
    });

    it('tooltip should disappear on blur', async () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      
      // Focus to show tooltip
      fireEvent.focus(maxButton);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
      
      // Blur to hide tooltip
      fireEvent.blur(maxButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('button should have aria-describedby linking to tooltip', async () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      
      // Button should have aria-describedby attribute
      expect(maxButton).toHaveAttribute('aria-describedby', 'max-qty-tooltip');
      
      // Focus to show tooltip
      fireEvent.focus(maxButton);
      
      // Tooltip should have matching id
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveAttribute('id', 'max-qty-tooltip');
      });
    });

    it('tooltip should appear on mouse hover', async () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      const container = maxButton.parentElement;
      
      // Hover over the container
      if (container) {
        fireEvent.mouseEnter(container);
      }
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });

    it('button should have focus ring styles (visual focus indicator)', () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      
      // Check if button has focus ring classes
      expect(maxButton.className).toContain('focus:outline-none');
      expect(maxButton.className).toContain('focus:ring');
    });

    it('clicking disabled button should show tooltip', async () => {
      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      const inputBefore = screen.getByLabelText('数量') as HTMLInputElement;
      const valueBefore = inputBefore.value;
      
      // Click the button
      fireEvent.click(maxButton);
      
      // Quantity should not change
      const inputAfter = screen.getByLabelText('数量') as HTMLInputElement;
      expect(inputAfter.value).toBe(valueBefore);
      
      // Tooltip should appear
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle zero cash correctly', () => {
      (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          portfolio: { cash: 0, positions: [] },
          executeOrder: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      render(<OrderPanel stock={mockStock} currentPrice={2000} />);
      
      const maxButton = screen.getByText(/最大/);
      expect(maxButton).toHaveAttribute('aria-disabled', 'true');
      expect(maxButton).not.toHaveAttribute('disabled');
    });

    it('should handle zero price correctly', () => {
      (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          portfolio: { cash: 1000000, positions: [] },
          executeOrder: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      render(<OrderPanel stock={mockStock} currentPrice={0} />);
      
      const maxButton = screen.getByText(/最大/);
      expect(maxButton).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
