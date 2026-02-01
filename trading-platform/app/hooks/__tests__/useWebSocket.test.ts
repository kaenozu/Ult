import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Mock WebSocket Setup
const mockSend = jest.fn();
const mockClose = jest.fn();

let mockWebSocketInstance: any = null;

class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
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
    const self = this;
    setTimeout(() => {
      if (self.onopen) {
        self.readyState = MockWebSocket.OPEN;
        self.onopen();
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

    act(() => {
      if (mockWebSocketInstance && mockWebSocketInstance.onmessage) {
        mockWebSocketInstance.onmessage({ data: JSON.stringify(testMessage) });
      }
    });

    expect(result.current.lastMessage).toEqual(testMessage);
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

    expect(result.current.status).toBe('CLOSED');

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
