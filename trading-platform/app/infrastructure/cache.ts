/**
 * Infrastructure - Cache
 * 
 * キャッシュ管理インフラストラクチャ
 * Refactored to support subscriptions, auto-cleanup, and unified usage.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private subscribers = new Map<string, Set<(data: T) => void>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTL = 300000, maxSize = 1000) { // デフォルト5分, 最大1000件
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttl?: number): void {
    // 既存のエントリがある場合は削除して、新しいエントリを末尾に追加する（順序を維持するため）
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });

    // 最大サイズを超えた場合、最も古いエントリ（先頭）を削除
    if (this.store.size > this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    // Notify subscribers
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    
    if (!entry) return undefined;
    
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    // LRU: Move accessed entry to the end
    this.store.delete(key);
    this.store.set(key, entry);
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    // Collect keys and prune expired ones if necessary
    const result: string[] = [];
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
      } else {
        result.push(key);
      }
    }
    return result;
  }

  size(): number {
    return this.store.size;
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  subscribe(key: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  invalidate(key: string): void {
    this.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.store.delete(key);
      }
    }
  }

  startCleanupInterval(intervalMs = 60000): void {
    this.stopCleanupInterval();
    this.cleanupInterval = setInterval(() => {
      this.pruneExpired();
    }, intervalMs);
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
      }
    }
  }

  // LRUポリシーで古いエントリを削除
  prune(maxSize: number): void {
    if (this.store.size <= maxSize) return;

    const keys = this.store.keys();
    while (this.store.size > maxSize) {
      const key = keys.next().value;
      if (key !== undefined) {
        this.store.delete(key);
      } else {
        break;
      }
    }
  }
}

export const globalCache = new Cache<unknown>();
