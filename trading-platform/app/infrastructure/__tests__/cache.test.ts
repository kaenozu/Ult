import { Cache } from '../cache';

describe('Cache', () => {
  it('should store and retrieve values', () => {
    const cache = new Cache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should respect TTL', async () => {
    const cache = new Cache<string>(100); // 100ms
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key')).toBeUndefined();
  });

  it('should evict oldest item when max size is exceeded', () => {
    const cache = new Cache<string>(1000, 2); // Max size 2

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
    const cache = new Cache<string>(1000, 2);

    cache.set('a', '1');
    cache.set('b', '2');

    cache.set('a', 'updated'); // 'a' becomes newest

    cache.set('c', '3'); // Should evict 'b', not 'a'

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('updated');
    expect(cache.get('c')).toBe('3');
  });
});
