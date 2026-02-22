import { Cache } from '../cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>();
  });

  afterEach(() => {
    cache.stopCleanupInterval();
  });

  it('should store and retrieve values', () => {
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should respect TTL', async () => {
    cache = new Cache<string>(100); // 100ms
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key')).toBeUndefined();
  });

  it('should evict oldest item when max size is exceeded', () => {
    cache = new Cache<string>(1000, 2); // Max size 2

    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);

    cache.set('c', '3'); // Evicts 'a'
    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
  });

  it('should update LRU order on set (overwrite)', () => {
    cache = new Cache<string>(1000, 2);

    cache.set('a', '1');
    cache.set('b', '2');

    cache.set('a', 'updated'); // 'a' becomes newest

    cache.set('c', '3'); // Should evict 'b', not 'a'

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('updated');
    expect(cache.get('c')).toBe('3');
  });

  it('should support subscriptions', () => {
    const callback = jest.fn();
    const unsubscribe = cache.subscribe('key', callback);

    cache.set('key', 'value1');
    expect(callback).toHaveBeenCalledWith('value1');

    cache.set('key', 'value2');
    expect(callback).toHaveBeenCalledWith('value2');

    unsubscribe();
    cache.set('key', 'value3');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should invalidate by pattern', () => {
    cache.set('user:1', 'Alice');
    cache.set('user:2', 'Bob');
    cache.set('post:1', 'Hello');

    cache.invalidatePattern(/^user:/);

    expect(cache.get('user:1')).toBeUndefined();
    expect(cache.get('user:2')).toBeUndefined();
    expect(cache.get('post:1')).toBe('Hello');
  });

  it('should auto-cleanup expired items', async () => {
    jest.useFakeTimers();
    cache = new Cache<string>(100); // 100ms TTL
    cache.startCleanupInterval(50); // check every 50ms

    cache.set('key', 'value');

    // Fast forward time past TTL
    jest.advanceTimersByTime(150);

    // Should be removed without accessing it
    // But since we can't inspect internal store directly without `get`,
    // and `get` does lazy cleanup anyway, we have to trust `pruneExpired` ran.
    // However, `size()` reflects the store size.
    // Wait, `get` cleans up too.
    // To verify auto-cleanup, we check `size()` *before* calling `get`.

    expect(cache.size()).toBe(0);

    jest.useRealTimers();
  });
});
