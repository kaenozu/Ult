import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { useTradingStore } from '@/app/store/tradingStore';

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
        setTimeout(() => {
            if (this.onopen) {
                this.readyState = MockWebSocket.OPEN;
                this.onopen();
            }
        }, 10);
    }
}

global.WebSocket = MockWebSocket as any;

// Mock store
jest.mock('@/app/store/tradingStore', () => ({
    useTradingStore: jest.fn(),
}));

describe('useWebSocket', () => {
    const mockUrl = 'ws://test.com';

    beforeEach(() => {
        jest.clearAllMocks();
        mockWebSocketInstance = null;
        (useTradingStore as unknown as jest.Mock).mockReturnValue(true); // Default connected
    });

    it('connects when isConnected is true', async () => {
        const { result } = renderHook(() => useWebSocket(mockUrl));

        expect(result.current.status).toBe('CONNECTING');

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        expect(result.current.status).toBe('OPEN');
    });

    it('receives messages correctly', async () => {
        const { result } = renderHook(() => useWebSocket(mockUrl));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        const testMessage = { type: 'signal', data: 'test' };

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

        await act(async () => {
            jest.advanceTimersByTime(20);
        });

        expect(result.current.status).toBe('OPEN');

        // Simulate close
        act(() => {
            if (mockWebSocketInstance) {
                mockWebSocketInstance.readyState = MockWebSocket.CLOSED;
                if (mockWebSocketInstance.onclose) {
                    mockWebSocketInstance.onclose({ code: 1006, reason: 'Abnormal Closure' });
                }
            }
        });

        expect(result.current.status).toBe('CLOSED');

        // Wait for reconnect timeout (3000ms)
        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(result.current.status).toBe('OPEN');
        jest.useRealTimers();
    });
});
