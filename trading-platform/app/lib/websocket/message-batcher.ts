/**
 * WebSocket Message Batcher
 * 
 * Batches WebSocket messages to reduce render frequency and improve performance.
 * Accumulates updates and processes them in batches to minimize component re-renders.
 */

import { performanceMonitor } from '@/app/lib/performance/monitor';

export interface BatchingConfig {
  /** Time window for batching in milliseconds (default: 150ms) */
  batchWindowMs: number;
  /** Maximum number of messages to accumulate before forcing a batch (default: 50) */
  maxBatchSize: number;
  /** Enable message deduplication (default: true) */
  enableDeduplication: boolean;
  /** Enable statistics tracking (default: true) */
  enableStats: boolean;
}

export interface BatchStats {
  /** Total number of messages received */
  totalMessages: number;
  /** Number of messages that were batched */
  batchedMessages: number;
  /** Number of duplicate messages detected */
  duplicateMessages: number;
  /** Number of batches processed */
  batchesProcessed: number;
  /** Number of renders saved (totalMessages - batchesProcessed) */
  rendersSaved: number;
  /** Average batch size */
  averageBatchSize: number;
}

export interface MessageBatch<T = unknown> {
  /** Batch of messages */
  messages: WebSocketMessage<T>[];
  /** Timestamp when batch was created */
  timestamp: number;
  /** Number of messages in this batch */
  size: number;
}

export type WebSocketMessage<T = unknown> = {
  type: string;
  data: T;
  timestamp?: number;
  id?: string;
};

/**
 * Message Batcher class for batching WebSocket messages
 */
export class MessageBatcher {
  private config: BatchingConfig;
  private messageBuffer: Map<string, WebSocketMessage> = new Map();
  private batchTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private onBatchCallback: ((batch: MessageBatch) => void) | null = null;
  private stats: BatchStats = {
    totalMessages: 0,
    batchedMessages: 0,
    duplicateMessages: 0,
    batchesProcessed: 0,
    rendersSaved: 0,
    averageBatchSize: 0,
  };
  private isProcessing = false;

  constructor(config: Partial<BatchingConfig> = {}) {
    this.config = {
      batchWindowMs: config.batchWindowMs ?? 150,
      maxBatchSize: config.maxBatchSize ?? 50,
      enableDeduplication: config.enableDeduplication ?? true,
      enableStats: config.enableStats ?? true,
    };
  }

  /**
   * Set callback to be invoked when a batch is ready
   */
  onBatch(callback: (batch: MessageBatch) => void): void {
    this.onBatchCallback = callback;
  }

  /**
   * Add a message to the batch buffer
   */
  addMessage<T>(message: WebSocketMessage<T>): void {
    if (this.config.enableStats) {
      this.stats.totalMessages++;
    }

    // Generate a unique key for deduplication
    const messageKey = this.generateMessageKey(message);

    // Check for duplicates if deduplication is enabled
    if (this.config.enableDeduplication) {
      if (this.messageBuffer.has(messageKey)) {
        // Update existing message with newer data
        this.messageBuffer.set(messageKey, message);
        if (this.config.enableStats) {
          this.stats.duplicateMessages++;
        }
        return;
      }
    }

    // Add message to buffer
    this.messageBuffer.set(messageKey, message);

    // Check if we've reached max batch size
    if (this.messageBuffer.size >= this.config.maxBatchSize) {
      this.processBatch();
      return;
    }

    // Schedule batch processing if not already scheduled
    if (!this.batchTimeoutId && !this.isProcessing) {
      this.scheduleBatch();
    }
  }

  /**
   * Generate a unique key for a message based on its type and data
   */
  private generateMessageKey(message: WebSocketMessage): string {
    const type = message.type;
    const id = message.id || '';
    
    // For market data messages, use symbol as key
    if (type === 'market_data' && message.data && typeof message.data === 'object') {
      const data = message.data as any;
      const symbol = data.symbol || '';
      return `${type}:${symbol}:${id}`;
    }

    return `${type}:${id}`;
  }

  /**
   * Schedule batch processing after configured window
   */
  private scheduleBatch(): void {
    this.batchTimeoutId = setTimeout(() => {
      this.processBatch();
    }, this.config.batchWindowMs);
  }

  /**
   * Process current batch of messages
   */
  private processBatch(): void {
    if (this.isProcessing || this.messageBuffer.size === 0) {
      return;
    }

    // Clear timeout
    if (this.batchTimeoutId) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }

    this.isProcessing = true;

    // Create batch from buffered messages
    const messages = Array.from(this.messageBuffer.values());
    const batch: MessageBatch = {
      messages,
      timestamp: Date.now(),
      size: messages.length,
    };

    // Clear buffer
    this.messageBuffer.clear();

    // Update statistics
    if (this.config.enableStats) {
      this.stats.batchedMessages += messages.length;
      this.stats.batchesProcessed++;
      this.stats.rendersSaved = this.stats.totalMessages - this.stats.batchesProcessed;
      this.stats.averageBatchSize = this.stats.batchedMessages / this.stats.batchesProcessed;
    }

    // Invoke callback
    if (this.onBatchCallback) {
      try {
        performanceMonitor.measure('websocket.batch_process', () => {
          this.onBatchCallback!(batch);
        });
      } catch (error) {
        console.error('[MessageBatcher] Error in batch callback:', error);
      }
    }

    this.isProcessing = false;

    // Process any messages that arrived during processing
    if (this.messageBuffer.size > 0) {
      this.scheduleBatch();
    }
  }

  /**
   * Force immediate batch processing
   */
  flush(): void {
    if (this.batchTimeoutId) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }
    this.processBatch();
  }

  /**
   * Get current statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalMessages: 0,
      batchedMessages: 0,
      duplicateMessages: 0,
      batchesProcessed: 0,
      rendersSaved: 0,
      averageBatchSize: 0,
    };
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.messageBuffer.size;
  }

  /**
   * Clear the message buffer without processing
   */
  clearBuffer(): void {
    this.messageBuffer.clear();
    if (this.batchTimeoutId) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BatchingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BatchingConfig {
    return { ...this.config };
  }

  /**
   * Destroy the batcher and clean up resources
   */
  destroy(): void {
    this.clearBuffer();
    this.onBatchCallback = null;
  }
}

/**
 * Create a message batcher with default configuration
 */
export function createMessageBatcher(config?: Partial<BatchingConfig>): MessageBatcher {
  return new MessageBatcher(config);
}

/**
 * Default message batcher instance
 */
export const defaultMessageBatcher = createMessageBatcher({
  batchWindowMs: 150,
  maxBatchSize: 50,
  enableDeduplication: true,
  enableStats: true,
});
