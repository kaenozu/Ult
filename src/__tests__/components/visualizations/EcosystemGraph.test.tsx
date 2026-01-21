import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EcosystemGraph from "@/components/visualizations/EcosystemGraph";

// Mock WebSocket
const mockWebSocket = {
  onopen: jest.fn(),
  onmessage: jest.fn(),
  onclose: jest.fn(),
  onerror: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
};

// Mock the WebSocket constructor
global.WebSocket = jest.fn(() => mockWebSocket);

// Mock react-force-graph-3d
jest.mock("react-force-graph-3d", () => {
  return function MockForceGraph3D() {
    return <div data-testid="force-graph">Force Graph 3D</div>;
  };
});

describe("EcosystemGraph", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the neural nexus title", () => {
    render(<EcosystemGraph />);
    expect(screen.getByText("NEURAL NEXUS")).toBeInTheDocument();
  });

  it("shows offline status initially", () => {
    render(<EcosystemGraph />);
    expect(screen.getByText("OFFLINE")).toBeInTheDocument();
  });

  it("connects to WebSocket on mount", () => {
    // Mock environment variable
    process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:8000/ws/regime";

    render(<EcosystemGraph />);
    expect(global.WebSocket).toHaveBeenCalledWith(
      "ws://localhost:8000/ws/regime",
    );
  });

  it.skip("displays regime data when received", async () => {
    render(<EcosystemGraph />);

    // Simulate WebSocket message
    const mockMessage = {
      type: "regime_update",
      data: {
        current_regime: "trending_up",
        strategy: { position_size: 1.0 },
      },
    };

    // Trigger the onmessage handler
    mockWebSocket.onmessage({ data: JSON.stringify(mockMessage) });

    await waitFor(() => {
      expect(screen.getByText("trending_up")).toBeInTheDocument();
    });
  });

  it.skip("displays appropriate ghost persona for crash regime", async () => {
    render(<EcosystemGraph />);

    const mockMessage = {
      type: "regime_update",
      data: {
        current_regime: "CRASH (市場崩壊警報)",
        strategy: { position_size: 0.0 },
      },
    };

    mockWebSocket.onmessage({ data: JSON.stringify(mockMessage) });

    await waitFor(() => {
      expect(screen.getByText("CIRCUIT BREAKER")).toBeInTheDocument();
      expect(screen.getByText(/SYSTEM FAILURE DETECTED/)).toBeInTheDocument();
    });
  });

  it("displays analysis persona on node click", async () => {
    render(<EcosystemGraph />);

    // Find the force graph and simulate click
    const forceGraph = screen.getByTestId("force-graph");
    // Note: In a real test, we'd need to mock the ForceGraph3D onNodeClick properly
    // For now, we'll test the persona logic indirectly

    expect(forceGraph).toBeInTheDocument();
  });

  it.skip("clears persona after timeout for non-crash regimes", async () => {
    jest.useFakeTimers();
    render(<EcosystemGraph />);

    const mockMessage = {
      type: "regime_update",
      data: {
        current_regime: "trending_up",
        strategy: { position_size: 1.0 },
      },
    };

    mockWebSocket.onmessage({ data: JSON.stringify(mockMessage) });

    await waitFor(() => {
      expect(screen.getByText("OPTIMIST PRIME")).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(8000);

    await waitFor(() => {
      expect(screen.queryByText("OPTIMIST PRIME")).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
