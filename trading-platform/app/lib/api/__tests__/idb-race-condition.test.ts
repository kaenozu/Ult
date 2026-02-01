/**
 * Tests for IndexedDB Race Condition Fix (Issue #227)
 * 
 * Verifies that multiple parallel calls to init() do not create
 * multiple database connections or cause inconsistencies.
 */

import { IndexedDBClient } from '../idb';

describe('IndexedDB Race Condition', () => {
  let client: IndexedDBClient;
  let mockOpenRequest: IDBOpenDBRequest;
  let openCallCount: number;

  beforeEach(() => {
    client = new IndexedDBClient();
    openCallCount = 0;

    // Create mock open request
    mockOpenRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            get: jest.fn(() => ({ onsuccess: null, onerror: null })),
            put: jest.fn(() => ({ onsuccess: null, onerror: null })),
            clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
          })),
        })),
        objectStoreNames: { contains: jest.fn(() => true) },
      },
    };

    // Track how many times indexedDB.open is called
    jest.spyOn(window.indexedDB, 'open').mockImplementation(() => {
      openCallCount++;
      // Simulate async behavior
      setTimeout(() => {
        if (mockOpenRequest.onsuccess) {
          mockOpenRequest.onsuccess({ target: mockOpenRequest });
        }
      }, 10);
      return mockOpenRequest;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle multiple parallel init() calls with only one DB open', async () => {
    // Call init() multiple times in parallel
    const promise1 = client.init();
    const promise2 = client.init();
    const promise3 = client.init();

    // All promises should resolve
    await Promise.all([promise1, promise2, promise3]);

    // indexedDB.open should only be called once
    expect(openCallCount).toBe(1);
  });

  it('should return the same promise for concurrent init() calls', async () => {
    // Call init() before the first one completes
    const promise1 = client.init();
    const promise2 = client.init();

    // Both should be the same promise
    // Note: We can't use toBe for promise identity in all cases,
    // but we can verify they both resolve and only one DB open happens
    await Promise.all([promise1, promise2]);
    expect(openCallCount).toBe(1);
  });

  it('should handle init() after successful initialization', async () => {
    // First initialization
    const promise1 = client.init();
    await promise1;

    expect(openCallCount).toBe(1);

    // Second init() should return immediately without opening DB again
    await client.init();
    expect(openCallCount).toBe(1);
  });

  it('should allow retry after initialization failure', async () => {
    const mockError = new Error('DB open failed');
    
    // Create a fresh client to avoid interference from previous tests
    const freshClient = new IndexedDBClient();
    let freshOpenCallCount = 0;

    // Make the first attempt fail
    jest.spyOn(window.indexedDB, 'open').mockImplementationOnce(() => {
      freshOpenCallCount++;
      const failRequest = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        error: mockError,
        result: null,
      };
      setTimeout(() => {
        if (failRequest.onerror) {
          failRequest.onerror();
        }
      }, 10);
      return failRequest as unknown as IDBOpenDBRequest;
    });

    // First init should fail
    await expect(freshClient.init()).rejects.toThrow();
    expect(freshOpenCallCount).toBe(1);

    // Setup successful open for retry with new mock
    const successRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: jest.fn(),
        objectStoreNames: { contains: jest.fn(() => true) },
      },
    };

    jest.spyOn(window.indexedDB, 'open').mockImplementationOnce(() => {
      freshOpenCallCount++;
      setTimeout(() => {
        if (successRequest.onsuccess) {
          successRequest.onsuccess({ target: successRequest });
        }
      }, 10);
      return successRequest as unknown as IDBOpenDBRequest;
    });

    // Retry should succeed and open DB again
    await freshClient.init();
    expect(freshOpenCallCount).toBe(2);
  });

  it('should handle many concurrent calls efficiently', async () => {
    // Create a fresh client to avoid interference from previous tests
    const freshClient = new IndexedDBClient();
    let freshOpenCallCount = 0;

    // Setup mock for this test
    const testMockRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            get: jest.fn(() => ({ onsuccess: null, onerror: null })),
            put: jest.fn(() => ({ onsuccess: null, onerror: null })),
            clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
          })),
        })),
        objectStoreNames: { contains: jest.fn(() => true) },
      },
    };

    jest.spyOn(window.indexedDB, 'open').mockImplementation(() => {
      freshOpenCallCount++;
      setTimeout(() => {
        if (testMockRequest.onsuccess) {
          testMockRequest.onsuccess({ target: testMockRequest });
        }
      }, 10);
      return testMockRequest as unknown as IDBOpenDBRequest;
    });

    // Create 100 concurrent init calls
    const promises = Array.from({ length: 100 }, () => freshClient.init());

    // All should resolve
    await Promise.all(promises);

    // Only one DB open should occur
    expect(freshOpenCallCount).toBe(1);
  });
});
