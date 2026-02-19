/**
 * Event Bus
 * 
 * Centralized event bus for event-driven architecture.
 * Replaces scattered EventEmitter instances throughout the codebase.
 */


import { EventMap } from '../types/shared';
import { devError } from '@/app/lib/utils/dev-logger';


type EventKey = keyof EventMap;

interface Subscription {
  unsubscribe: () => void;
}

type EventHandler<T> = (data: T) => void | Promise<void>;

class EventBus {
  private subscriptions = new Map<EventKey, Set<EventHandler<unknown>>>();
  private wildcardHandlers: Set<(event: string, data: unknown) => void> = new Set();
  private eventHistory: Array<{ event: EventKey; data: unknown; timestamp: Date }> = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Subscribe to an event
   */
  subscribe<K extends EventKey>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): Subscription {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    
    this.subscriptions.get(event)!.add(handler as EventHandler<unknown>);

    return {
      unsubscribe: () => {
        this.subscriptions.get(event)?.delete(handler as EventHandler<unknown>);
        if (this.subscriptions.get(event)?.size === 0) {
          this.subscriptions.delete(event);
        }
      },
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first emission)
   */
  once<K extends EventKey>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): Subscription {
    const subscription = this.subscribe(event, (data) => {
      handler(data);
      subscription.unsubscribe();
    });

    return subscription;
  }

  /**
   * Publish an event
   */
  publish<K extends EventKey>(event: K, data: EventMap[K]): void {
    // Add to history
    this.eventHistory.push({ event, data, timestamp: new Date() });
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }

    // Notify specific event handlers
    const handlers = this.subscriptions.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            result.catch((error) => {
              devError(`Error in event handler for ${event}:`, error);
            });
          }
        } catch (error) {
          devError(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // Notify wildcard handlers
    this.wildcardHandlers.forEach((handler) => {
      try {
        handler(event, data);
      } catch (error) {
        devError('Error in wildcard event handler:', error);
      }
    });
  }

  /**
   * Subscribe to all events (wildcard)
   */
  subscribeAll(handler: (event: string, data: unknown) => void): Subscription {
    this.wildcardHandlers.add(handler);

    return {
      unsubscribe: () => {
        this.wildcardHandlers.delete(handler);
      },
    };
  }

  /**
   * Get event history
   */
  getHistory(): Array<{ event: EventKey; data: unknown; timestamp: Date }> {
    return [...this.eventHistory];
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.wildcardHandlers.clear();
    this.eventHistory = [];
  }

  /**
   * Get subscription count for an event
   */
  getSubscriptionCount(event: EventKey): number {
    return this.subscriptions.get(event)?.size ?? 0;
  }

  /**
   * Check if event has subscribers
   */
  hasSubscribers(event: EventKey): boolean {
    return this.subscriptions.has(event) && this.subscriptions.get(event)!.size > 0;
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

export const eventBus = getEventBus();
