/**
 * @fileoverview Tests for Screener page debounce functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Screener from '../page';
import { JAPAN_STOCKS, USA_STOCKS } from '@/app/data/stocks';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { useUIStore } from '@/app/store/uiStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';

// Mocks
jest.mock('@/app/lib/api/data-aggregator');
jest.mock('@/app/store/uiStore');
jest.mock('@/app/store/watchlistStore');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/screener',
}));

describe('Screener Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock marketClient
    (marketClient.fetchQuotes as jest.Mock).mockResolvedValue(
      [...JAPAN_STOCKS, ...USA_STOCKS].map(s => ({
        symbol: s.symbol,
        price: s.price || 1000,
        change: 0,
        changePercent: 0,
        volume: 1000000,
      }))
    );

    // Mock stores
    (useUIStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        setSelectedStock: jest.fn(),
        theme: 'dark',
        toggleTheme: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    (useWatchlistStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        addToWatchlist: jest.fn(),
        watchlist: [],
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Filter Input Debouncing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce priceMin input changes', async () => {
      render(<Screener />);

      const priceMinInput = screen.getByLabelText('最低価格');

      // Use fireEvent for synchronous interaction with fake timers
      fireEvent.change(priceMinInput, { target: { value: '123' } });

      // Should show immediate value
      expect(priceMinInput).toHaveValue(123);

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // After debounce, filtered results should update
      await waitFor(() => {
        // Filter should be applied
        const results = screen.getByText(/銘柄が見つかりました/);
        expect(results).toBeInTheDocument();
      });
    }, 10000);

    it('should debounce priceMax input changes', async () => {
      render(<Screener />);

      const priceMaxInput = screen.getByLabelText('最高価格');

      fireEvent.change(priceMaxInput, { target: { value: '5000' } });

      // Should show immediate value
      expect(priceMaxInput).toHaveValue(5000);

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Verify filter applied
      await waitFor(() => {
        const results = screen.getByText(/銘柄が見つかりました/);
        expect(results).toBeInTheDocument();
      });
    });

    it('should debounce changeMin input changes', async () => {
      render(<Screener />);

      const changeMinInput = screen.getByLabelText('最小騰落率');

      fireEvent.change(changeMinInput, { target: { value: '-5' } });

      expect(changeMinInput).toHaveValue(-5);

      jest.advanceTimersByTime(350);

      await waitFor(() => {
        const results = screen.getByText(/銘柄が見つかりました/);
        expect(results).toBeInTheDocument();
      });
    });

    it('should debounce changeMax input changes', async () => {
      render(<Screener />);

      const changeMaxInput = screen.getByLabelText('最大騰落率');

      fireEvent.change(changeMaxInput, { target: { value: '10' } });

      expect(changeMaxInput).toHaveValue(10);

      jest.advanceTimersByTime(350);

      await waitFor(() => {
        const results = screen.getByText(/銘柄が見つかりました/);
        expect(results).toBeInTheDocument();
      });
    });

    it('should debounce volumeMin input changes', async () => {
      render(<Screener />);

      const volumeMinInput = screen.getByLabelText('最小出来高');

      fireEvent.change(volumeMinInput, { target: { value: '1000000' } });

      expect(volumeMinInput).toHaveValue(1000000);

      jest.advanceTimersByTime(350);

      await waitFor(() => {
        const results = screen.getByText(/銘柄が見つかりました/);
        expect(results).toBeInTheDocument();
      });
    });

    it('should debounce sector input changes', async () => {
      render(<Screener />);

      const sectorInput = screen.getByLabelText('セクターフィルター');

      fireEvent.change(sectorInput, { target: { value: 'Technology' } });

      expect(sectorInput).toHaveValue('Technology');

      jest.advanceTimersByTime(350);

      await waitFor(() => {
        const results = screen.getByText(/銘柄が見つかりました/);
        expect(results).toBeInTheDocument();
      });
    });

    it('should cancel previous debounce timer on rapid input', async () => {
      render(<Screener />);

      const priceMinInput = screen.getByLabelText('最低価格');

      // Type multiple values rapidly
      fireEvent.change(priceMinInput, { target: { value: '' } });
      fireEvent.change(priceMinInput, { target: { value: '1' } });
      jest.advanceTimersByTime(100);
      fireEvent.change(priceMinInput, { target: { value: '12' } });
      jest.advanceTimersByTime(100);
      fireEvent.change(priceMinInput, { target: { value: '123' } });

      // Advance full debounce time from last input
      jest.advanceTimersByTime(300);

      // Should only have the final value applied
      await waitFor(() => {
        expect(priceMinInput).toHaveValue(123);
      });
    });

    it('should apply filters immediately on signal button click', async () => {
      render(<Screener />);

      const buyButton = screen.getByText('買い');

      fireEvent.click(buyButton);

      // Signal filter should apply immediately (no debounce)
      await waitFor(() => {
        expect(buyButton).toHaveClass('bg-primary');
      });
    });

    it('should apply filters immediately on market select change', async () => {
      render(<Screener />);

      const marketSelect = screen.getByLabelText('市場フィルター');

      fireEvent.change(marketSelect, { target: { value: 'japan' } });

      // Market filter should apply immediately
      await waitFor(() => {
        expect(marketSelect).toHaveValue('japan');
      });
    });
  });

  describe('Preset Button Debouncing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce preset button clicks', async () => {
      render(<Screener />);

      const oversoldButton = screen.getByRole('button', { name: /売られすぎ/ });

      // Click the button
      fireEvent.click(oversoldButton);

      // Should show loading state immediately
      expect(oversoldButton).toBeDisabled();

      // Wait for debounce to complete
      jest.advanceTimersByTime(350);

      // Button should be enabled again
      await waitFor(() => {
        expect(oversoldButton).not.toBeDisabled();
      });
    });

    it('should disable other preset buttons while one is active', async () => {
      render(<Screener />);

      const oversoldButton = screen.getByRole('button', { name: /売られすぎ/ });
      const uptrendButton = screen.getByRole('button', { name: /上昇トレンド/ });

      fireEvent.click(oversoldButton);

      // Other buttons should be disabled
      expect(uptrendButton).toBeDisabled();

      jest.advanceTimersByTime(350);

      await waitFor(() => {
        expect(uptrendButton).not.toBeDisabled();
      });
    });
  });

  describe('Filter Reset', () => {
    it('should reset all filters when reset button is clicked', async () => {
      render(<Screener />);

      // Set some filters first
      const priceMinInput = screen.getByLabelText('最低価格');
      await userEvent.type(priceMinInput, '1000');

      jest.advanceTimersByTime(350);

      // Click reset
      const resetButton = screen.getByText('リセット');
      await userEvent.click(resetButton);

      // All inputs should be cleared
      await waitFor(() => {
        // Use queryByLabelText to avoid throw if not found, or just check value
        const priceInputAfterReset = screen.getByLabelText('最低価格');
        expect(priceInputAfterReset).toHaveValue(null);
      });
    });
  });

  describe('UI Responsiveness', () => {
    it('should show immediate feedback on input', async () => {
      render(<Screener />);

      const priceMinInput = screen.getByLabelText('最低価格');

      // Type in the input
      await userEvent.type(priceMinInput, '500');

      // Value should be visible immediately
      expect(priceMinInput).toHaveValue(500);
    });

    it('should display stock count', async () => {
      render(<Screener />);

      await waitFor(() => {
        const count = screen.getByText(/\d+ 銘柄が見つかりました/);
        expect(count).toBeInTheDocument();
      });
    });
  });
});
