import { useEffect, useRef, useState, useCallback } from 'react';

export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR';

interface WebSocketMessage {
  type: string;
  data: unknown;
}

const WS_ENABLED_KEY = 'trader-pro-websocket-enabled';

function isWebSocketEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const enabled = localStorage.getItem(WS_ENABLED_KEY);
    return enabled !== 'false';
  } catch {
    return true;
  }
}

function setWebSocketEnabled(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WS_ENABLED_KEY, String(enabled));
  }
}

export function useWebSocket(url: string) {
    const [status, setStatus] = useState<WebSocketStatus>('CLOSED');
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef<number>(0);
    const MAX_RECONNECT_ATTEMPTS = 3;

    const connect = useCallback(() => {
        if (!isWebSocketEnabled()) {
            console.log('WebSocket: Connection disabled by user');
            setStatus('CLOSED');
            return;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) return;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.log('WebSocket: Max reconnect attempts reached, giving up');
            return;
        }

        try {
            setStatus('CONNECTING');
            const ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                setStatus('OPEN');
                reconnectAttemptsRef.current = 0;
                setWebSocketEnabled(true);
                console.log('WebSocket connected to:', url);
            };

            ws.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(data);
                } catch (e) {
                    console.error('WebSocket message parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setStatus('ERROR');
            };

            ws.onclose = (event) => {
                setStatus('CLOSED');
                console.log('WebSocket closed:', event.code, event.reason);

                // If closed with error or abnormal close, disable auto-reconnect after max attempts
                if (event.code !== 1000 && reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    console.log('WebSocket: Abnormal closure detected, disabling WebSocket');
                    setWebSocketEnabled(false);
                    return;
                }

                // Exponential backoff reconnection
                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current++;
                    const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    
                    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log(`WebSocket: Attempting reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
                        connect();
                    }, backoffDelay);
                }
            };
        } catch (e) {
            console.error('WebSocket connection failed:', e);
            setStatus('ERROR');
            // Disable WebSocket if connection fails
            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                setWebSocketEnabled(false);
            }
        }
    }, [url]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
        setStatus('CLOSED');
    }, []);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        setWebSocketEnabled(true);
        connect();
    }, [connect]);

    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    const sendMessage = useCallback((msg: unknown) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(msg));
        } else {
            console.warn('WebSocket: Cannot send message, connection not open');
        }
    }, []);

    return { status, lastMessage, sendMessage, connect, disconnect, reconnect };
}
