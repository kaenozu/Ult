/**
 * Resilient WebSocket Client Library for Trader Pro
 *
 * Provides a production-grade WebSocket client with:
 * - Enhanced reconnection logic with exponential backoff and jitter
 * - Connection state machine with explicit states and transitions
 * - Heartbeat/ping-pong mechanism for stale connection detection
 * - Message queueing for disconnected states
 * - Event emitter interface for state changes
 * - Graceful degradation with fallback polling
 * - Comprehensive error categorization
 * - Connection quality monitoring (latency, packet loss, throughput)
 */

import { WebSocketStatus as BaseWebSocketStatus } from '@/app/hooks/useWebSocket';
import { 
  ConnectionMetricsTracker, 
  createConnectionMetricsTracker,
  type ConnectionMetrics 
} from '@/app/lib/websocket/ConnectionMetrics';

// ============================================================================
// Type Definitions
// ============================================================================

/** Extended WebSocket status including intermediate states */
export type WebSocketStatus =
  | 'CONNECTING'
  | 'OPEN'
  | 'CLOSING'
  | 'CLOSED'
  | 'RECONNECTING'
  | 'FALLBACK'
  | 'ERROR';

/** WebSocket message types */
export type WebSocketMessageType =
  | 'connection'
  | 'market_data'
  | 'signal'
  | 'alert'
  | 'ping'
  | 'pong'
  | 'echo'
  | 'error'
  | 'fallback';

/** WebSocket message structure */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType | string;
  data: T;
  timestamp?: number;
  id?: string;
}

/** Error categories for different retry strategies */
export type WebSocketErrorCategory =
  | 'RECOVERABLE'      // Network timeout, temporary server error
  | 'NON_RECOVERABLE'  // Authentication failure, protocol error
  | 'CONNECTION_LOST'  // Connection dropped, can retry
  | 'RATE_LIMITED';    // Too many requests, backoff required

/** WebSocket error with categorization */
export interface WebSocketError {
  category: WebSocketErrorCategory;
  message: string;
  originalError?: Error;
  code?: number;
  timestamp: number;
}

/** Connection state transition */
export interface StateTransition {
  from: WebSocketStatus;
  to: WebSocketStatus;
  timestamp: number;
  reason?: string;
}

/** WebSocket configuration */
export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableFallback?: boolean;
  fallbackPollingInterval?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  enableJitter?: boolean;
  maxBackoffDelay?: number;
}

/** Event listener types */
type EventType = 'open' | 'message' | 'error' | 'close' | 'statusChange' | 'stateTransition' | 'metricsUpdate';
type EventListener<T = unknown> = (data: T) => void;

/** WebSocket client options */
export interface WebSocketClientOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: WebSocketError) => void;
  onClose?: (event: CloseEvent) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  onStateTransition?: (transition: StateTransition) => void;
  onMetricsUpdate?: (metrics: ConnectionMetrics) => void;
  fallbackDataFetcher?: () => Promise<unknown>;
}

/** Queued message with metadata */
interface QueuedMessage {
  message: WebSocketMessage;
  timestamp: number;
  retryCount: number;
  id: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep utility for async delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate unique message ID
 */
const generateMessageId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Calculate backoff delay with optional jitter
 */
const calculateBackoffDelay = (
  attempt: number,
  baseInterval: number,
  maxDelay: number,
  enableJitter: boolean
): number => {
  // Exponential backoff: base * 2^(attempt-1)
  const exponentialDelay = baseInterval * Math.pow(2, attempt - 1);
  const clampedDelay = Math.min(exponentialDelay, maxDelay);

  if (!enableJitter) {
    return clampedDelay;
  }

  // Add jitter: ±25% randomization to prevent thundering herd
  const jitter = (Math.random() - 0.5) * 0.5 * clampedDelay;
  return Math.max(0, clampedDelay + jitter);
};

/**
 * Categorize WebSocket errors
 */
const categorizeError = (error: Error | Event | CloseEvent): WebSocketError => {
  const timestamp = Date.now();

  // Close event analysis
  if ('code' in error) {
    const closeEvent = error as CloseEvent;
    const code = closeEvent.code;

    // Non-recoverable codes
    if ([1002, 1003, 1007, 1008, 1009, 1010, 1011].includes(code)) {
      return {
        category: 'NON_RECOVERABLE',
        message: `Protocol error: ${closeEvent.reason || 'Unknown'}`,
        code,
        timestamp,
      };
    }

    // Authentication failure
    if (code === 1008) {
      return {
        category: 'NON_RECOVERABLE',
        message: 'Authentication failed',
        code,
        timestamp,
      };
    }

    // Normal closure or going away
    if ([1000, 1001].includes(code)) {
      return {
        category: 'CONNECTION_LOST',
        message: `Connection closed: ${closeEvent.reason || 'Normal closure'}`,
        code,
        timestamp,
      };
    }

    // Rate limiting (custom code)
    if (code === 4029) {
      return {
        category: 'RATE_LIMITED',
        message: 'Rate limited by server',
        code,
        timestamp,
      };
    }
  }

  // Network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('etimedout')) {
      return {
        category: 'RECOVERABLE',
        message: 'Network timeout',
        originalError: error,
        timestamp,
      };
    }

    if (message.includes('econnrefused') || message.includes('refused')) {
      return {
        category: 'RECOVERABLE',
        message: 'Connection refused',
        originalError: error,
        timestamp,
      };
    }

    if (message.includes('enetunreach') || message.includes('unreachable')) {
      return {
        category: 'RECOVERABLE',
        message: 'Network unreachable',
        originalError: error,
        timestamp,
      };
    }
  }

  // Default to recoverable
  return {
    category: 'RECOVERABLE',
    message: error instanceof Error ? error.message : 'Unknown error',
    originalError: error instanceof Error ? error : undefined,
    timestamp,
  };
};

// ============================================================================
// State Machine
// ============================================================================

/**
 * Valid state transitions for the WebSocket connection
 */
const VALID_STATE_TRANSITIONS: Record<WebSocketStatus, WebSocketStatus[]> = {
  'CLOSED': ['CONNECTING'],
  'CONNECTING': ['OPEN', 'CLOSED', 'ERROR', 'RECONNECTING'],
  'OPEN': ['CLOSING', 'CLOSED', 'ERROR', 'RECONNECTING'],
  'CLOSING': ['CLOSED', 'ERROR'],
  'RECONNECTING': ['CONNECTING', 'CLOSED', 'ERROR', 'FALLBACK'],
  'FALLBACK': ['CONNECTING', 'CLOSED'],
  'ERROR': ['CONNECTING', 'CLOSED', 'RECONNECTING', 'FALLBACK'],
};

/**
 * Check if a state transition is valid
 */
const isValidTransition = (from: WebSocketStatus, to: WebSocketStatus): boolean => {
  if (from === to) return true;
  return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
};

// ============================================================================
// Resilient WebSocket Client
// ============================================================================

/**
 * Production-grade WebSocket client with resilience features
 */
export class ResilientWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private options: WebSocketClientOptions;
  private status: WebSocketStatus = 'CLOSED';
  private reconnectAttempts = 0;
  private messageQueue: QueuedMessage[] = [];
  private eventListeners: Map<EventType, Set<EventListener>> = new Map();
  private metricsTracker: ConnectionMetricsTracker;

  // Timer references
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private fallbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private metricsUpdateIntervalId: ReturnType<typeof setInterval> | null = null;

  // State tracking
  private isManualClose = false;
  private lastPongTime = 0;
  private stateHistory: StateTransition[] = [];
  private connectionStartTime: number = 0;
  private currentPingSequence = 0;

  constructor(config: WebSocketConfig, options: WebSocketClientOptions = {}) {
    this.config = {
      url: config.url,
      protocols: config.protocols || [],
      reconnectInterval: config.reconnectInterval || 2000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      enableFallback: config.enableFallback ?? true,
      fallbackPollingInterval: config.fallbackPollingInterval || 5000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      heartbeatTimeout: config.heartbeatTimeout || 10000,
      enableJitter: config.enableJitter ?? true,
      maxBackoffDelay: config.maxBackoffDelay || 30000,
    };
    this.options = options;
    this.metricsTracker = createConnectionMetricsTracker();
    
    // Start metrics update interval
    this.startMetricsUpdate();
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if WebSocket is connected and ready
   */
  isConnected(): boolean {
    return this.status === 'OPEN' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection duration in milliseconds
   */
  getConnectionDuration(): number {
    if (this.connectionStartTime === 0) return 0;
    return Date.now() - this.connectionStartTime;
  }

  /**
   * Get state transition history
   */
  getStateHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Get connection quality metrics
   */
  getMetrics(): ConnectionMetrics {
    return this.metricsTracker.getMetrics();
  }

  /**
   * Add event listener
   */
  on<T>(event: EventType, listener: EventListener<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(listener as EventListener);
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    this.isManualClose = false;

    // Prevent multiple simultaneous connection attempts
    if (this.status === 'CONNECTING' || this.status === 'RECONNECTING') {
      console.log('[WebSocket] Connection already in progress');
      return;
    }

    // Check if already connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    // Check max reconnection attempts
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached, entering fallback mode');
      this.transitionTo('FALLBACK');
      this.startFallback();
      
      // Schedule periodic reconnection attempts even in fallback mode
      this.scheduleReconnectFromFallback();
      return;
    }

    try {
      const targetStatus = this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING';
      this.transitionTo(targetStatus);

      console.log(`[WebSocket] ${targetStatus === 'RECONNECTING' ? 'Reconnecting' : 'Connecting'} to ${this.config.url}...`);

      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Send a message through WebSocket
   */
  send<T = unknown>(message: WebSocketMessage<T>): boolean {
    const messageWithId: WebSocketMessage<T> = {
      ...message,
      id: message.id || generateMessageId(),
      timestamp: message.timestamp || Date.now(),
    };

    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(messageWithId));
        this.emit('message', { type: 'sent', message: messageWithId });
        return true;
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        this.queueMessage(messageWithId);
        return false;
      }
    } else {
      // Queue message for later delivery
      this.queueMessage(messageWithId);
      console.log(`[WebSocket] Message queued (status: ${this.status})`);
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    this.clearAllTimers();
    this.stopFallback();
    this.stopHeartbeat();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.transitionTo('CLOSING');
        this.ws.close(1000, 'Client disconnecting');
      }
      this.ws = null;
    }

    this.transitionTo('CLOSED');
    console.log('[WebSocket] Disconnected');
  }

  /**
   * Reconnect to WebSocket server
   */
  reconnect(): void {
    console.log('[WebSocket] Manual reconnect requested');
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.disconnect();
    this.messageQueue = [];
    this.eventListeners.clear();
    this.stateHistory = [];
    this.stopMetricsUpdate();
  }

  // ========================================================================
  // Private Methods
  // ========================================================================
  
  /**
   * Start metrics update interval
   */
  private startMetricsUpdate(): void {
    // Update metrics every second
    this.metricsUpdateIntervalId = setInterval(() => {
      const metrics = this.metricsTracker.getMetrics();
      this.options.onMetricsUpdate?.(metrics);
      this.emit('metricsUpdate', metrics);
    }, 1000);
  }
  
  /**
   * Stop metrics update interval
   */
  private stopMetricsUpdate(): void {
    if (this.metricsUpdateIntervalId) {
      clearInterval(this.metricsUpdateIntervalId);
      this.metricsUpdateIntervalId = null;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.connectionStartTime = Date.now();
      this.transitionTo('OPEN');
      this.stopFallback();
      this.startHeartbeat();
      this.flushMessageQueue();
      
      // Reset and start metrics tracking
      this.metricsTracker.recordConnectionEstablished();
      
      this.options.onOpen?.(event);
      this.emit('open', event);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Record message received for metrics
        const messageSize = event.data.length || 0;
        this.metricsTracker.recordMessageReceived(messageSize);

        // Handle pong messages
        if (message.type === 'pong') {
          this.lastPongTime = Date.now();
          this.clearHeartbeatTimeout();
          
          // Record pong for latency tracking
          if (message.id) {
            this.metricsTracker.recordPongReceived(message.id);
          }
          return;
        }

        this.options.onMessage?.(message);
        this.emit('message', message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (event) => {
      console.error('[WebSocket] Error occurred');
      const wsError = categorizeError(event);
      this.options.onError?.(wsError);
      this.emit('error', wsError);
    };

    this.ws.onclose = (event) => {
      console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
      this.stopHeartbeat();
      
      // Record connection lost
      this.metricsTracker.recordConnectionLost();

      const wsError = categorizeError(event);

      if (this.isManualClose) {
        this.transitionTo('CLOSED');
      } else {
        // Record reconnection attempt
        this.metricsTracker.recordReconnection();
        this.handleUnexpectedClose(wsError);
      }

      this.options.onClose?.(event);
      this.emit('close', event);
    };
  }

  /**
   * Handle unexpected connection close
   */
  private handleUnexpectedClose(error: WebSocketError): void {
    switch (error.category) {
      case 'NON_RECOVERABLE':
        console.error('[WebSocket] Non-recoverable error, entering fallback mode');
        this.transitionTo('FALLBACK');
        this.startFallback();
        break;

      case 'RATE_LIMITED':
        console.log('[WebSocket] Rate limited, backing off before retry');
        this.transitionTo('ERROR');
        this.scheduleReconnect(60000); // Wait 1 minute
        break;

      case 'RECOVERABLE':
      case 'CONNECTION_LOST':
      default:
        this.transitionTo('ERROR');
        this.scheduleReconnect();
        break;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    const wsError = categorizeError(error);
    this.options.onError?.(wsError);
    this.emit('error', wsError);

    if (!this.isManualClose) {
      this.handleUnexpectedClose(wsError);
    }
  }

  /**
   * Transition to a new state with validation
   */
  private transitionTo(newStatus: WebSocketStatus, reason?: string): void {
    const oldStatus = this.status;

    if (!isValidTransition(oldStatus, newStatus)) {
      console.warn(`[WebSocket] Invalid state transition: ${oldStatus} -> ${newStatus}`);
      return;
    }

    this.status = newStatus;

    const transition: StateTransition = {
      from: oldStatus,
      to: newStatus,
      timestamp: Date.now(),
      reason,
    };

    this.stateHistory.push(transition);

    // Keep only last 100 transitions
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }

    this.options.onStatusChange?.(newStatus);
    this.options.onStateTransition?.(transition);
    this.emit('statusChange', newStatus);
    this.emit('stateTransition', transition);
  }

  /**
   * Schedule reconnection attempt with backoff
   */
  private scheduleReconnect(customDelay?: number): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectAttempts++;

    const delay = customDelay ?? calculateBackoffDelay(
      this.reconnectAttempts,
      this.config.reconnectInterval,
      this.config.maxBackoffDelay,
      this.config.enableJitter
    );

    console.log(`[WebSocket] Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.lastPongTime = Date.now();

    this.heartbeatIntervalId = setInterval(() => {
      if (this.isConnected()) {
        // Generate sequence ID for this ping
        this.currentPingSequence++;
        const sequenceId = `ping-${this.currentPingSequence}`;
        
        // Record ping sent for metrics
        this.metricsTracker.recordPingSent(sequenceId);
        
        // Send ping with sequence ID
        this.send({ 
          type: 'ping', 
          data: { timestamp: Date.now() },
          id: sequenceId
        });

        // Set timeout for pong response
        this.heartbeatTimeoutId = setTimeout(() => {
          const timeSinceLastPong = Date.now() - this.lastPongTime;
          if (timeSinceLastPong > this.config.heartbeatTimeout) {
            console.warn('[WebSocket] Heartbeat timeout, forcing reconnect');
            this.ws?.close(4029, 'Heartbeat timeout');
          }
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    this.clearHeartbeatTimeout();
  }

  /**
   * Clear heartbeat timeout
   */
  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  /**
   * Start fallback polling mode
   */
  private startFallback(): void {
    if (this.fallbackIntervalId) return;

    console.log('[WebSocket] Starting fallback polling mode');

    this.fallbackIntervalId = setInterval(async () => {
      try {
        let data: unknown;

        if (this.options.fallbackDataFetcher) {
          data = await this.options.fallbackDataFetcher();
        } else {
          // Default fallback: fetch market snapshot
          const response = await fetch('/api/market/snapshot');
          data = await response.json();
        }

        this.options.onMessage?.({
          type: 'fallback',
          data,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('[WebSocket] Fallback polling failed:', error);
      }
    }, this.config.fallbackPollingInterval);
  }

  /**
   * Stop fallback polling mode
   */
  private stopFallback(): void {
    if (this.fallbackIntervalId) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
      console.log('[WebSocket] Stopped fallback polling mode');
    }
  }

  /**
   * Schedule reconnection attempt from fallback mode
   * Periodically tries to recover WebSocket connection
   */
  private scheduleReconnectFromFallback(): void {
    // Try to reconnect every 30 seconds when in fallback mode
    const attemptReconnect = () => {
      if (this.status === 'FALLBACK' && !this.isManualClose) {
        console.log('[WebSocket] Attempting to recover from fallback mode...');
        this.reconnectAttempts = 0; // Reset attempts for recovery
        this.connect();
        
        // Schedule next attempt if still in fallback
        setTimeout(attemptReconnect, 30000);
      }
    };
    
    setTimeout(attemptReconnect, 30000);
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage<T>(message: WebSocketMessage<T>): void {
    const queuedMessage: QueuedMessage = {
      message,
      timestamp: Date.now(),
      retryCount: 0,
      id: message.id || generateMessageId(),
    };

    this.messageQueue.push(queuedMessage);

    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 1000) {
      console.warn('[WebSocket] Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }
  }

  /**
   * Flush queued messages when connection is established
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`[WebSocket] Sending ${this.messageQueue.length} queued messages`);

    const failedMessages: QueuedMessage[] = [];

    this.messageQueue.forEach((queued) => {
      try {
        this.ws?.send(JSON.stringify(queued.message));
      } catch (error) {
        console.error('[WebSocket] Failed to send queued message:', error);
        if (queued.retryCount < 3) {
          queued.retryCount++;
          failedMessages.push(queued);
        }
      }
    });

    this.messageQueue = failedMessages;

    if (failedMessages.length > 0) {
      console.warn(`[WebSocket] ${failedMessages.length} messages failed to send, will retry`);
    }
  }

  /**
   * Clear all timers
   */
  private clearAllTimers(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: EventType, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new resilient WebSocket client instance
 */
export function createResilientWebSocketClient(
  config: WebSocketConfig,
  options?: WebSocketClientOptions
): ResilientWebSocketClient {
  return new ResilientWebSocketClient(config, options);
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_RESILIENT_WS_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  reconnectInterval: 2000,
  maxReconnectAttempts: 5,
  enableFallback: true,
  fallbackPollingInterval: 5000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  enableJitter: true,
  maxBackoffDelay: 30000,
};

// ============================================================================
// Re-exports
// ============================================================================

export type { ConnectionMetrics, ConnectionQuality } from '@/app/lib/websocket/ConnectionMetrics';

// ============================================================================
// Backward Compatibility
// ============================================================================

/**
 * Legacy WebSocketStatus mapping for backward compatibility
 */
export function mapToLegacyStatus(status: WebSocketStatus): BaseWebSocketStatus {
  switch (status) {
    case 'CONNECTING':
    case 'RECONNECTING':
      return 'CONNECTING';
    case 'OPEN':
      return 'OPEN';
    case 'CLOSING':
    case 'CLOSED':
      return 'CLOSED';
    case 'ERROR':
    case 'FALLBACK':
      return 'ERROR';
    default:
      return 'CLOSED';
  }
}
