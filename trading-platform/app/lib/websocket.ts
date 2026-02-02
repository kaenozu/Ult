/**
 * WebSocket Client Library for Trader Pro
 *
 * Provides a centralized WebSocket client with fallback handling,
 * connection management, and type-safe messaging.
 */

// WebSocket status type
export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR' | 'DISCONNECTED';

// WebSocket status constants for use in tests and runtime
export const WebSocketStatus = {
  CONNECTING: 'CONNECTING' as const,
  OPEN: 'OPEN' as const,
  CLOSED: 'CLOSED' as const,
  ERROR: 'ERROR' as const,
  DISCONNECTED: 'DISCONNECTED' as const,
};

// WebSocket message types
export type WebSocketMessageType =
  | 'connection'
  | 'market_data'
  | 'signal'
  | 'alert'
  | 'ping'
  | 'pong'
  | 'echo'
  | 'error';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType | string;
  data: T;
  timestamp?: number;
  id?: string;
}

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableFallback?: boolean;
  fallbackPollingInterval?: number;
}

// Default configuration constants
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_RECONNECT_INTERVAL = 2000;
const DEFAULT_MAX_BACKOFF_DELAY = 60000;

/**
 * WebSocket client options
 */
export interface WebSocketClientOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  onClose?: (event: CloseEvent) => void;
}

/**
 * Validates WebSocket message structure
 * Ensures message has required fields and proper types
 */
function validateWebSocketMessage(message: unknown): message is WebSocketMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const msg = message as Record<string, unknown>;

  // Check required 'type' field
  if (!('type' in msg) || typeof msg.type !== 'string') {
    return false;
  }

  // Check optional 'data' field - can be any type but must exist if provided
  if ('data' in msg && msg.data === undefined) {
    return false;
  }

  // Check optional 'timestamp' - must be number if provided
  if ('timestamp' in msg && typeof msg.timestamp !== 'number') {
    return false;
  }

  return true;
}

/**
 * WebSocket Client Class
 * Manages WebSocket connection, reconnection, and message handling
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private options: WebSocketClientOptions;
  private reconnectAttempts: number = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnecting: boolean = false;
  private status: WebSocketStatus = WebSocketStatus.DISCONNECTED;
  private manualClose: boolean = false;

  constructor(config: WebSocketConfig, options?: WebSocketClientOptions) {
    this.config = config;
    this.options = options || {};
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;
    this.messageQueue = [];
    this.isConnecting = false;
    this.status = WebSocketStatus.DISCONNECTED;
    this.manualClose = false;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isConnecting || this.status === WebSocketStatus.CONNECTING) {
      console.log('[WebSocket] Already connecting or connected');
      return;
    }

    this.isConnecting = true;
    this.status = WebSocketStatus.CONNECTING;
    this.options.onStatusChange?.(this.status);

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event: MessageEvent) => this.handleMessage(event);
      this.ws.onerror = (event: Event) => this.handleError(event);
      this.ws.onclose = (event: CloseEvent) => this.handleClose(event);

      this.ws.binaryType = 'arraybuffer';

      console.log('[WebSocket] Connecting to:', this.config.url);
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket:', error);
      this.handleError(error as Event);
      this.status = WebSocketStatus.ERROR;
      this.isConnecting = false;
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('[WebSocket] Connected to:', this.config.url);
    this.status = WebSocketStatus.OPEN;
    this.options.onStatusChange?.(this.status);
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.options.onConnect?.();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = event.data as ArrayBuffer;
      const decoded = new TextDecoder().decode(data);
      const message: WebSocketMessage = JSON.parse(decoded);

      if (!validateWebSocketMessage(message)) {
        console.error('[WebSocket] Invalid message format:', message);
        return;
      }

      this.options.onMessage?.(message);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
    this.status = WebSocketStatus.ERROR;
    this.options.onStatusChange?.(this.status);
    this.options.onError?.(event);

    // Schedule reconnection attempt with exponential backoff
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    this.options.onClose?.(event);

    if (this.manualClose) {
      console.log('[WebSocket] Manual close detected, not reconnecting');
      this.manualClose = false;
      this.status = 'CLOSED';
      this.options.onStatusChange?.(this.status);
      this.options.onDisconnect?.();
      return;
    }

    this.status = 'DISCONNECTED';
    this.options.onStatusChange?.(this.status);
    this.ws = null;

    // Schedule reconnection attempt with exponential backoff
    this.scheduleReconnect();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (!this.ws) {
      console.log('[WebSocket] Already disconnected');
      return;
    }

    console.log('[WebSocket] Disconnecting...');

    this.manualClose = true;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
    }

    this.ws = null;
    this.status = WebSocketStatus.DISCONNECTED;

    this.options.onDisconnect?.();
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    console.log('[WebSocket] Force reconnecting...');
    this.disconnect();
    this.manualClose = false; // Reset manual close to allow connecting
    this.connect();
  }

  /**
   * Send a message
   */
  send(message: WebSocketMessage): boolean {
    if (!this.ws || this.status !== WebSocketStatus.OPEN) {
      console.warn('[WebSocket] Cannot send message: Not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.manualClose) {
      console.log('[WebSocket] Manual close detected, not reconnecting');
      return;
    }

    const maxAttempts = this.config.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
    
    // Check if max reconnect attempts exceeded
    if (this.reconnectAttempts >= maxAttempts) {
      console.error(`[WebSocket] Max reconnect attempts (${maxAttempts}) exceeded. Giving up.`);
      this.status = WebSocketStatus.ERROR;
      this.options.onStatusChange?.(this.status);
      return;
    }

    this.reconnectAttempts++;

    // 指数バックオフを使用して再接続間隔を増やす
    // 初回: 2秒, 2回目: 4秒, 3回目: 8秒, 4回目: 16秒, 5回目: 32秒
    const baseInterval = this.config.reconnectInterval || DEFAULT_RECONNECT_INTERVAL;
    const delay = Math.min(
      baseInterval * Math.pow(2, this.reconnectAttempts - 1),
      DEFAULT_MAX_BACKOFF_DELAY // 最大60秒
    );

    console.log(`[WebSocket] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear any pending reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.disconnect();

    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  /**
   * Create a new WebSocket client instance
   */
  static create(config: WebSocketConfig, options?: WebSocketClientOptions): WebSocketClient {
    return new WebSocketClient(config, options);
  }
}

/**
 * Factory function to create a WebSocket client
 */
export function createWebSocketClient(config: WebSocketConfig, options?: WebSocketClientOptions): WebSocketClient {
  return WebSocketClient.create(config, options);
}

/**
 * Default WebSocket URL configuration
 */
export const DEFAULT_WS_CONFIG: WebSocketConfig = {
  url: typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws`
    : 'ws://localhost:3001/ws',
  reconnectInterval: 2000,
  maxReconnectAttempts: 10,
  enableFallback: true,
  fallbackPollingInterval: 5000,
};
