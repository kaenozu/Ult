/**
 * WebSocket Monitoring Integration
 * 
 * Provides monitoring for WebSocket connections and events.
 */

import { trackWebSocket } from '@/app/lib/monitoring';
import { logger } from '@/app/core/logger';

/**
 * Monitored WebSocket wrapper
 * Automatically tracks connection events and performance
 */
export class MonitoredWebSocket extends WebSocket {
  private connectionStartTime: number = 0;
  private messageCount: number = 0;

  constructor(url: string | URL, protocols?: string | string[]) {
    super(url, protocols);
    
    this.connectionStartTime = performance.now();
    
    // Track connection events
    this.addEventListener('open', this.handleOpen.bind(this));
    this.addEventListener('close', this.handleClose.bind(this));
    this.addEventListener('error', this.handleError.bind(this));
    this.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleOpen(event: Event): void {
    const duration = performance.now() - this.connectionStartTime;
    trackWebSocket('connect', true, duration);
    logger.info(`[WebSocket] Connected in ${duration.toFixed(2)}ms`, undefined, 'MonitoredWebSocket');
  }

  private handleClose(event: CloseEvent): void {
    const duration = performance.now() - this.connectionStartTime;
    const success = event.wasClean;
    
    trackWebSocket('disconnect', success, duration,
      success ? undefined : `Code: ${event.code}, Reason: ${event.reason}`
    );
    
    logger.info(
      `[WebSocket] Disconnected after ${duration.toFixed(2)}ms (clean: ${success}, messages: ${this.messageCount})`,
      undefined,
      'MonitoredWebSocket'
    );
  }

  private handleError(event: Event): void {
    trackWebSocket('error', false, undefined, 'WebSocket error occurred');
    logger.error('[WebSocket] Error occurred', new Error(String(event)), 'MonitoredWebSocket');
  }

  private handleMessage(event: MessageEvent): void {
    this.messageCount++;
    
    // Track message processing periodically (every 100 messages)
    if (this.messageCount % 100 === 0) {
      trackWebSocket('message', true);
      logger.info(`[WebSocket] Received ${this.messageCount} messages`, undefined, 'MonitoredWebSocket');
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    messageCount: number;
    connectionDuration: number;
    messagesPerSecond: number;
  } {
    const duration = (performance.now() - this.connectionStartTime) / 1000;
    return {
      messageCount: this.messageCount,
      connectionDuration: duration,
      messagesPerSecond: duration > 0 ? this.messageCount / duration : 0,
    };
  }
}

/**
 * Create a monitored WebSocket connection
 */
export function createMonitoredWebSocket(
  url: string | URL,
  protocols?: string | string[]
): MonitoredWebSocket {
  return new MonitoredWebSocket(url, protocols);
}
