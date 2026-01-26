import { useEffect, useRef, useState, useCallback } from 'react';
import { useTradingStore } from '@/app/store/tradingStore';

export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR';

export function useWebSocket(url: string) {
    const [status, setStatus] = useState<WebSocketStatus>('CLOSED');
    const [lastMessage, setLastMessage] = useState<any>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null);
    const isConnected = useTradingStore(state => state.isConnected);

    const connect = useCallback(() => {
        if (!isConnected) return;
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        try {
            setStatus('CONNECTING');
            const ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                setStatus('OPEN');
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                } catch (e) {
                    console.error('WebSocket message parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setStatus('ERROR');
            };

            ws.onclose = () => {
                setStatus('CLOSED');
                // Auto reconnect if it was supposed to be connected
                if (isConnected) {
                    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, 3000);
                }
            };
        } catch (e) {
            console.error('WebSocket connection failed:', e);
            setStatus('ERROR');
        }
    }, [url, isConnected]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        setStatus('CLOSED');
    }, []);

    useEffect(() => {
        if (isConnected) {
            connect();
        } else {
            disconnect();
        }
        return () => disconnect();
    }, [isConnected, connect, disconnect]);

    const sendMessage = useCallback((msg: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(msg));
        }
    }, []);

    return { status, lastMessage, sendMessage };
}
