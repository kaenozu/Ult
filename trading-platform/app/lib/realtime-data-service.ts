/**
 * WebSocketによるリアルタイムデータ取得サービス
 * 
 * このモジュールは、リアルタイムの株価データをWebSocket経由で取得する機能を提供します。
 */

import { OHLCV, Stock } from '../types';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface RealTimeData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface WebSocketHandler {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onData: (data: RealTimeData) => void;
}

class RealTimeDataService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts: number = 0;
  private handlers: WebSocketHandler | null = null;
  private subscribedSymbols: Set<string> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config
    };
  }

  /**
   * WebSocket接続を開始
   */
  connect(handlers: WebSocketHandler): void {
    this.handlers = handlers;

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        if (this.handlers?.onConnect) {
          this.handlers.onConnect();
        }
        
        // 再接続時に購読を再設定
        if (this.subscribedSymbols.size > 0) {
          this.resubscribe();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealTimeData;
          if (this.handlers?.onData) {
            this.handlers.onData({
              ...data,
              timestamp: new Date(data.timestamp)
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (this.handlers?.onDisconnect) {
          this.handlers.onDisconnect();
        }
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.handlers?.onError) {
          this.handlers.onError(error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      if (this.handlers?.onError) {
        this.handlers.onError(error as Event);
      }
      this.attemptReconnect();
    }
  }

  /**
   * シンボルを購読
   */
  subscribe(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot subscribe.');
      return;
    }

    const message = JSON.stringify({
      action: 'subscribe',
      symbols: [symbol]
    });

    this.ws.send(message);
    this.subscribedSymbols.add(symbol);
  }

  /**
   * 複数シンボルを購読
   */
  subscribeMultiple(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot subscribe.');
      return;
    }

    const message = JSON.stringify({
      action: 'subscribe',
      symbols: symbols
    });

    this.ws.send(message);
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
  }

  /**
   * シンボルの購読を解除
   */
  unsubscribe(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot unsubscribe.');
      return;
    }

    const message = JSON.stringify({
      action: 'unsubscribe',
      symbols: [symbol]
    });

    this.ws.send(message);
    this.subscribedSymbols.delete(symbol);
  }

  /**
   * すべての購読を解除
   */
  unsubscribeAll(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot unsubscribe.');
      return;
    }

    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length === 0) {
      return;
    }

    const message = JSON.stringify({
      action: 'unsubscribe',
      symbols: symbols
    });

    this.ws.send(message);
    this.subscribedSymbols.clear();
  }

  /**
   * 再接続を試行
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(this.handlers!);
      }, this.config.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached. Giving up.');
    }
  }

  /**
   * 再接続時の購読再設定
   */
  private resubscribe(): void {
    if (this.subscribedSymbols.size > 0) {
      const symbols = Array.from(this.subscribedSymbols);
      const message = JSON.stringify({
        action: 'subscribe',
        symbols: symbols
      });

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      }
    }
  }

  /**
   * 接続を閉じる
   */
  disconnect(): void {
    if (this.ws) {
      this.unsubscribeAll();
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 接続状態を取得
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 接続状態を取得（数値）
   */
  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * 購読中のシンボルを取得
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }
}

// シンプルなWebSocketプロバイダーとして利用可能なインスタンス
export const realTimeDataService = new RealTimeDataService({
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/ws'
});

// 使用例:
// realTimeDataService.connect({
//   onConnect: () => console.log('Connected to WebSocket'),
//   onDisconnect: () => console.log('Disconnected from WebSocket'),
//   onError: (error) => console.error('WebSocket error:', error),
//   onData: (data) => console.log('Received data:', data)
// });
// 
// realTimeDataService.subscribe('AAPL');