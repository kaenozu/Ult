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
  private defaultTTL: number;

  constructor(defaultTTL = 300000, maxSize = 1000) { // デフォルト5分, 最大1000件
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttl?: number): void {
    // 既存のエントリがある場合は削除して、新しいエントリを末尾に追加する（順序を維持するため）
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, {
      value,
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
    
    return entry.value;
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
    // Collect keys and prune expired ones if necessary, but don't re-insert them (no LRU refresh in keys())
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
    // Fast size check - might include expired items until next prune or access
    // This is more efficient than calling keys().length
    return this.store.size;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // LRUポリシーで古いエントリを削除
  // set()で順序が維持されているため、先頭から削除すればよい
  prune(maxSize: number): void {
    if (this.store.size <= maxSize) return;

    // マップのイテレータは挿入順（＝タイムスタンプ順）
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
