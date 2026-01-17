import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SignalCard from "@/components/dashboard/SignalCard";
import { getSignal, executeTrade } from "@/lib/api";
import { SignalResponse } from "@/types";

// Mock the API functions
jest.mock("@/lib/api", () => ({
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
  });

  it("displays bearish signal correctly", async () => {
    mockGetSignal.mockResolvedValue({
      ticker: "TSLA",
      signal: -1,
      confidence: 0.7,
      explanation: "Strong sell signal",
      strategy: "Reversal",
      entry_price: 100,
      stop_loss: 110,
      take_profit: 90,
    });

    renderWithProviders(<SignalCard ticker="TSLA" name="Tesla Inc." />);

    await waitFor(() => {
      expect(screen.getByText("売り")).toBeInTheDocument();
      expect(screen.getByText("Strong sell signal")).toBeInTheDocument();
      expect(screen.getByText("70%")).toBeInTheDocument();
    });
  });

  it("displays neutral signal correctly", async () => {
    mockGetSignal.mockResolvedValue({
      ticker: "GOOGL",
      signal: 0,
      confidence: 0.5,
      explanation: "Hold position",
      strategy: "Hold",
    });

    renderWithProviders(<SignalCard ticker="GOOGL" name="Alphabet Inc." />);

    await waitFor(() => {
      expect(screen.getByText("様子見")).toBeInTheDocument();
      expect(screen.getByText("Hold position")).toBeInTheDocument();
    });
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
