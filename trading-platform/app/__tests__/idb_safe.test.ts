import { IndexedDBClient } from '../lib/api/idb';

describe('IndexedDBClient Safe Tests', () => {
  let client: IndexedDBClient;
  let mockOpenRequest: unknown;

  beforeEach(() => {
    client = new IndexedDBClient();
    // const mockRequestObj = { onsuccess: null, onerror: null, result: null };

    mockOpenRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            get: jest.fn(() => ({ onsuccess: null })),
            put: jest.fn(() => ({ onsuccess: null })),
            clear: jest.fn(() => ({ onsuccess: null })),
          })),
        })),
        objectStoreNames: { contains: jest.fn(() => true) },
      },
    };

    jest.spyOn(window.indexedDB, 'open').mockReturnValue(mockOpenRequest as unknown as IDBOpenDBRequest);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize successfully', async () => {
    const initPromise = client.init();
    if (mockOpenRequest.onsuccess) mockOpenRequest.onsuccess({ target: mockOpenRequest });
    await expect(initPromise).resolves.toBeUndefined();
  });
});