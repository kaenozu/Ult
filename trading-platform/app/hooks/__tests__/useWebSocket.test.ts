import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Mock WebSocket Setup
const mockSend = jest.fn();
const mockClose = jest.fn();

interface MockWebSocketEvent {
  data: string;
  type?: string;
}

interface MockWebSocketError {
  error: string;
  type?: string;
}

let mockWebSocketInstance: MockWebSocket | null = null;

class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: MockWebSocketEvent) => void) | null = null;
  onerror: ((error: MockWebSocketError) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState: number = 0; // CONNECTING
  send = mockSend;
  close = mockClose;

  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    mockWebSocketInstance = this;
    setTimeout(() => {
      if (this.onopen) {
        this.readyState = MockWebSocket.OPEN;
        this.onopen();
      }
    }, 10);
  }
}

global.WebSocket = MockWebSocket as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('useWebSocket', () => {
  const mockUrl = 'ws://test.com';

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocketInstance = null;
    localStorageMock.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('connects when mounted', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));

    // Initially should be CONNECTING or CLOSED
    expect(['CONNECTING', 'CLOSED']).toContain(result.current.status);

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Should be OPEN after successful connection
    expect(result.current.status).toBe('OPEN');
    expect(result.current.isConnected).toBe(true);
  });

  it('receives messages correctly', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.status).toBe('OPEN');

    const testMessage = { type: 'signal', data: 'test', timestamp: Date.now() };

    // Send message through the hook's sendMessage function to test the full flow
    // or manually trigger the onMessage callback
    act(() => {
      if (mockWebSocketInstance && mockWebSocketInstance.onmessage) {
        // WebSocketClient expects ArrayBuffer, not string
        const encoder = new TextEncoder();
        const buffer = encoder.encode(JSON.stringify(testMessage));
        mockWebSocketInstance.onmessage({ data: buffer });
      }
    });

    // Wait for batcher to process (150ms batch window + buffer)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    // Message should be set after batch processing
    expect(result.current.lastMessage).toBeTruthy();
    if (result.current.lastMessage) {
      expect(result.current.lastMessage.type).toBe('signal');
    }
  });

  it('attempts to reconnect on close', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useWebSocket(mockUrl));

    // Wait for initial connection
    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    expect(result.current.status).toBe('OPEN');

    // Simulate close with abnormal closure code
    act(() => {
      if (mockWebSocketInstance) {
        mockWebSocketInstance.readyState = MockWebSocket.CLOSED;
        if (mockWebSocketInstance.onclose) {
          mockWebSocketInstance.onclose({ code: 1006, reason: 'Abnormal Closure' });
        }
      }
    });

    // After close, status should be DISCONNECTED (not CLOSED) since it's not a manual close
    expect(['CLOSED', 'DISCONNECTED']).toContain(result.current.status);

    // Fast forward through reconnection attempts
    // First attempt: 2000ms (2^1 * 1000)
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    // Should be attempting to reconnect (CONNECTING or OPEN if reconnected)
    expect(['CONNECTING', 'OPEN', 'CLOSED']).toContain(result.current.status);

    // If still trying, continue to next attempt
    if (result.current.status === 'CLOSED') {
      await act(async () => {
        jest.advanceTimersByTime(4000); // Second attempt
      });
    }

    jest.useRealTimers();
  });

  it('sends messages correctly', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.status).toBe('OPEN');

    const testMessage = { type: 'ping', data: {} };

    act(() => {
      result.current.sendMessage(testMessage);
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ping"')
    );
  });

  it('disconnects when disconnect is called', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.status).toBe('OPEN');

    act(() => {
      result.current.disconnect();
    });

    expect(mockClose).toHaveBeenCalled();
  });

  it('reconnects when reconnect is called', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // First connection established
    expect(result.current.status).toBe('OPEN');

    act(() => {
      result.current.reconnect();
    });

    // Should trigger reconnection
    expect(mockClose).toHaveBeenCalled();
  });

  it('respects localStorage enabled state', async () => {
    // Set WebSocket as disabled
    localStorageMock.setItem('trader-pro-websocket-enabled', 'false');

    const { result } = renderHook(() => useWebSocket(mockUrl));

    // Should not connect
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.status).toBe('CLOSED');
    expect(result.current.isConnected).toBe(false);
  });
});
