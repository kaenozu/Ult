import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketDataPanel } from '../MarketDataPanel';

describe('MarketDataPanel Accessibility', () => {
  const mockSymbols = ['AAPL', 'GOOGL', 'MSFT'];
  const mockOnSelectSymbol = jest.fn();

  it('renders a list of buttons for symbols', () => {
    render(
      <MarketDataPanel
        symbols={mockSymbols}
        selectedSymbol="AAPL"
        onSelectSymbol={mockOnSelectSymbol}
      />
    );

    // Should find buttons for each symbol
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(mockSymbols.length);

    // Check that buttons have correct text content
    expect(buttons[0]).toHaveTextContent('AAPL');
    expect(buttons[1]).toHaveTextContent('GOOGL');
    expect(buttons[2]).toHaveTextContent('MSFT');
  });

  it('highlights the selected symbol with aria-pressed', () => {
    render(
      <MarketDataPanel
        symbols={mockSymbols}
        selectedSymbol="GOOGL"
        onSelectSymbol={mockOnSelectSymbol}
      />
    );

    const buttons = screen.getAllByRole('button');

    // AAPL not selected
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    // GOOGL selected
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    // MSFT not selected
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelectSymbol when a button is clicked', () => {
    render(
      <MarketDataPanel
        symbols={mockSymbols}
        selectedSymbol="AAPL"
        onSelectSymbol={mockOnSelectSymbol}
      />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Click GOOGL

    expect(mockOnSelectSymbol).toHaveBeenCalledWith('GOOGL');
  });

  it('buttons are focusable via tab', () => {
    render(
      <MarketDataPanel
        symbols={mockSymbols}
        selectedSymbol="AAPL"
        onSelectSymbol={mockOnSelectSymbol}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    buttons[1].focus();
    expect(document.activeElement).toBe(buttons[1]);
  });
});
