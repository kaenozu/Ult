/**
 * Infrastructure - WebSocket
 * 
 * WebSocket通信インフラストラクチャ
 */

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export type WebSocketMessageHandler = (data: any) => void;
export type WebSocketErrorHandler = (error: Error) => void;
export type WebSocketCloseHandler = (code: number, reason: string) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers = new Set<WebSocketMessageHandler>();
  private errorHandlers = new Set<WebSocketErrorHandler>();
  private closeHandlers = new Set<WebSocketCloseHandler>();

  constructor(private config: WebSocketConfig) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messageHandlers.forEach(handler => handler(data));
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        this.ws.onerror = (error) => {
          this.errorHandlers.forEach(handler => 
            handler(new Error('WebSocket error'))
          );
        };

        this.ws.onclose = (event) => {
          this.stopHeartbeat();
          this.closeHandlers.forEach(handler => 
            handler(event.code, event.reason)
          );
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: WebSocketMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onError(handler: WebSocketErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onClose(handler: WebSocketCloseHandler): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000;
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private attemptReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 5;
    const interval = this.config.reconnectInterval || 5000;

    if (this.reconnectAttempts >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error);
    }, interval * this.reconnectAttempts);
  }
}
