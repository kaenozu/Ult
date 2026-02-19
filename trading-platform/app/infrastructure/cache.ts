/**
 * Infrastructure - Cache
 * 
 * キャッシュ管理インフラストラクチャ
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private pruneInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTTL = 300000, maxSize = 1000) {
    this.maxSize = maxSize;
    
    // Auto-prune expired entries every minute
    this.pruneInterval = setInterval(() => {
      this.pruneExpired();
    }, 60000);
  }

  set(key: string, value: T, ttl?: number): void {
    this.store.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });

    // Auto-prune if size exceeds limit
    if (this.store.size > this.maxSize) {
      this.prune(this.maxSize);
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys()).filter(key => this.has(key));
  }

  size(): number {
    return this.keys().length;
  }

  // LRUポリシーで古いエントリを削除
  prune(maxSize: number): void {
    if (this.store.size <= maxSize) return;

    const entries = Array.from(this.store.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toDelete = entries.slice(0, entries.length - maxSize);
    toDelete.forEach(([key]) => this.store.delete(key));
  }

  // TTL期限切れエントリを削除
  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
      }
    }
  }

  // Clean up interval on destroy
  destroy(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }
    this.clear();
  }
}

export const globalCache = new Cache<unknown>();
