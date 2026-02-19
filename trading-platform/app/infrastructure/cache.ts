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
