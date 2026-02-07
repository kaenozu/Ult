/**
 * WebSocketClient.ts
 *
 * リアルタイム市場データ配信サーバーとの通信を担当するクライアント。
 * 購読の管理、自動再接続、ストアへのデータ反映を行います。
 */

import { useTradingStore } from '@/app/store/tradingStore';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private subscriptions: Set<string> = new Set();
  private isManualClose = false;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  /**
   * サーバーに接続する
   */
  connect() {
    this.isManualClose = false;
    try {
      // セキュリティ向上のため、クエリパラメータでのトークン送信を廃止
      this.socket = new WebSocket(this.url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.handleReconnect();
    }
  }

  /**
   * 接続解除
   */
  disconnect() {
    this.isManualClose = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * シンボルを購読する
   */
  subscribe(symbols: string | string[]) {
    const symbolList = Array.isArray(symbols) ? symbols : [symbols];
    symbolList.forEach(s => this.subscriptions.add(s.toUpperCase()));

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'subscribe',
        data: symbolList.join(','),
      }));
    }
  }

  /**
   * 購読を解除する
   */
  unsubscribe(symbols: string | string[]) {
    const symbolList = Array.isArray(symbols) ? symbols : [symbols];
    symbolList.forEach(s => this.subscriptions.delete(s.toUpperCase()));

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'unsubscribe',
        data: symbolList.join(','),
      }));
    }
  }

  private handleOpen() {
    console.log('[WebSocket] Connected to server, sending auth...');
    this.reconnectAttempts = 0;
    
    // 接続直後に認証メッセージを送信
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'auth',
        data: { token: this.token }
      }));
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'authenticated':
          console.log('[WebSocket] Authentication successful');
          useTradingStore.getState().setConnectionStatus(true);
          // 認証成功後に既存の購読を再送
          if (this.subscriptions.size > 0) {
            this.subscribe(Array.from(this.subscriptions));
          }
          break;
        case 'market_data':
          this.handleMarketData(message.data);
          break;
        case 'connection':
          console.log('[WebSocket] Server Welcome:', message.data.message);
          break;
        case 'error':
          console.error('[WebSocket] Server Error:', message.data.message);
          if (message.data.code === 'AUTH_FAILED') {
            this.disconnect(); // 認証失敗時は再接続しない
          }
          break;
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleMarketData(data: any) {
    // 1. ストアにデータを反映
    useTradingStore.getState().batchUpdateStockData([{
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      volume: data.volume,
    }]);

    // 2. カスタムイベントを発行（フックなどがリッスンできるようにする）
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('market-data-update', { detail: data });
      window.dispatchEvent(event);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log(`[WebSocket] Connection closed (code: ${event.code})`);
    if (!this.isManualClose) {
      this.handleReconnect();
    }
  }

  private handleError(error: Event) {
    console.error('[WebSocket] Error detected:', error);
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting in ${this.reconnectInterval}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('[WebSocket] Max reconnect attempts reached');
    }
  }
}

// シングルトンインスタンスのエクスポート
// デフォルトの接続先とトークン（開発用）
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
// 注意: 本番環境では必ず NEXT_PUBLIC_WS_TOKEN 環境変数を設定してください
const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || 'dev-token-placeholder';

export const webSocketClient = new WebSocketClient(WS_URL, WS_TOKEN);
