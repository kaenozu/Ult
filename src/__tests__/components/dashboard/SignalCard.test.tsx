import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SignalCard from "@/components/features/dashboard/SignalCard";
import { getSignal, executeTrade } from "@/components/shared/utils/api";
import { SignalResponse } from "@/types";

// Mock the API functions
jest.mock("@/components/shared/utils/api", () => ({
  getSignal: jest.fn(),
  executeTrade: jest.fn(),
}));

const mockGetSignal = getSignal as jest.MockedFunction<
  () => Promise<SignalResponse | undefined>
>;
const mockExecuteTrade = executeTrade as jest.MockedFunction<
  typeof executeTrade
>;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

describe("SignalCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm and window.alert
    Object.defineProperty(window, "confirm", {
      value: jest.fn(() => true),
      writable: true,
    });
    Object.defineProperty(window, "alert", {
      value: jest.fn(),
      writable: true,
    });
  });

  it("renders ticker and name correctly", () => {
    mockGetSignal.mockResolvedValue(undefined); // No signal data

    renderWithProviders(<SignalCard ticker="AAPL" name="Apple Inc." />);

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("displays bullish signal correctly", async () => {
    mockGetSignal.mockResolvedValue({
      ticker: "AAPL",
      signal: 1,
      confidence: 0.8,
      explanation: "Strong buy signal",
      strategy: "Momentum",
      entry_price: 150,
      stop_loss: 140,
      take_profit: 160,
    });

    renderWithProviders(<SignalCard ticker="AAPL" name="Apple Inc." />);

    await waitFor(() => {
      expect(screen.getByText("強気買い")).toBeInTheDocument();
      expect(screen.getByText("Strong buy signal")).toBeInTheDocument();
      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText("¥150")).toBeInTheDocument();
      expect(screen.getByText("¥160")).toBeInTheDocument();
    expect(screen.getByText("¥140")).toBeInTheDocument();
  });

  it("displays loading state initially", () => {
    mockGetSignal.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<SignalCard ticker="AAPL" name="Apple Inc." />);

    // Should show loading or default state
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    mockGetSignal.mockRejectedValue(new Error("API Error"));

    renderWithProviders(<SignalCard ticker="AAPL" name="Apple Inc." />);

    await waitFor(() => {
      // Should fall back to default values
      expect(screen.getByText("Waiting for analysis...")).toBeInTheDocument();
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  it("displays neutral signal correctly", async () => {
    mockGetSignal.mockResolvedValue({
      ticker: "AAPL",
      signal: 0,
      confidence: 0.5,
      explanation: "Hold position",
      strategy: "Conservative",
      entry_price: 0,
      stop_loss: 0,
      take_profit: 0,
    });

    renderWithProviders(<SignalCard ticker="AAPL" name="Apple Inc." />);

    await waitFor(() => {
      expect(screen.getByText("待機")).toBeInTheDocument();
      expect(screen.getByText("Hold position")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  it("shows correct colors for different signals", async () => {
    // Test bullish signal colors
    mockGetSignal.mockResolvedValue({
      ticker: "AAPL",
      signal: 1,
      confidence: 0.9,
      explanation: "Bullish signal",
      strategy: "Test",
      entry_price: 100,
      stop_loss: 95,
      take_profit: 110,
    });

    const { rerender } = renderWithProviders(<SignalCard ticker="AAPL" name="Apple Inc." />);

    await waitFor(() => {
      // Check for bullish styling (this would require more specific selectors)
      expect(screen.getByText("強気買い")).toBeInTheDocument();
    });

    // Test bearish signal
    mockGetSignal.mockResolvedValue({
      ticker: "AAPL",
      signal: -1,
      confidence: 0.8,
      explanation: "Bearish signal",
      strategy: "Test",
      entry_price: 100,
      stop_loss: 105,
      take_profit: 95,
    });

    rerender(<SignalCard ticker="AAPL" name="Apple Inc." />);

    await waitFor(() => {
      expect(screen.getByText("弱気売り")).toBeInTheDocument();
    });
  });

  it("displays strategy information correctly", async () => {
    mockGetSignal.mockResolvedValue({
      ticker: "AAPL",
      signal: 1,
      confidence: 0.7,
      explanation: "Technical analysis",
      strategy: "RSI + MACD",
      entry_price: 150,
      stop_loss: 145,
      take_profit: 155,
    });

    renderWithProviders(<SignalCard ticker="AAPL" name="Apple Inc." />);

    await waitFor(() => {
      expect(screen.getByText("RSI + MACD")).toBeInTheDocument();
      expect(screen.getByText("Technical analysis")).toBeInTheDocument();
    });
  });

  it("handles very long ticker names", () => {
    renderWithProviders(<SignalCard ticker="VERYLONGTICKERNAME" name="Very Long Company Name" />);

    expect(screen.getByText("VERYLONGTICKERNAME")).toBeInTheDocument();
    expect(screen.getByText("Very Long Company Name")).toBeInTheDocument();
  });

  it("executes trade on button click when entry price exists", async () => {
    mockGetSignal.mockResolvedValue({
      ticker: "MSFT",
      signal: 1,
      confidence: 0.9,
      explanation: "Buy signal",
      strategy: "Test",
      entry_price: 200,
      stop_loss: 190,
      take_profit: 210,
    });
    mockExecuteTrade.mockResolvedValue({
      success: true,
      message: "Order placed successfully",
    });

    renderWithProviders(<SignalCard ticker="MSFT" name="Microsoft Corp." />);

    await waitFor(() => {
      expect(screen.getByText("注文実行")).toBeInTheDocument();
    });

    const button = screen.getByText("注文実行");
    fireEvent.click(button);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockExecuteTrade).toHaveBeenCalled();
    });
  });

  it("does not execute trade when no entry price", async () => {
    mockGetSignal.mockResolvedValue({
      ticker: "NVDA",
      signal: 0,
      confidence: 0.5,
      explanation: "No clear signal",
      strategy: "Wait",
    });

    renderWithProviders(<SignalCard ticker="NVDA" name="NVIDIA Corp." />);

    await waitFor(() => {
      expect(screen.getByText("注文実行")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("注文実行"));

    expect(mockExecuteTrade).not.toHaveBeenCalled();
  });
});