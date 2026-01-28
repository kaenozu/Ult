/** @jest-environment node */
import { IndexedDBClient } from '../lib/api/idb';

describe('IndexedDBClient', () => {
    let client: IndexedDBClient;
    let mockIDB: any;
    let mockStore: any;
    let mockTransaction: any;
    let mockDb: any;

    beforeEach(() => {
        mockStore = {
            get: jest.fn(),
            put: jest.fn(),
            clear: jest.fn(),
        };
        mockTransaction = {
            objectStore: jest.fn().mockReturnValue(mockStore),
        };
        mockDb = {
            transaction: jest.fn().mockReturnValue(mockTransaction),
            objectStoreNames: {
                contains: jest.fn().mockReturnValue(false),
            },
            createObjectStore: jest.fn(),
        };
        mockIDB = {
            open: jest.fn(),
        };

        global.indexedDB = mockIDB;
        client = new IndexedDBClient();
    });

    it('initializes DB correctly', async () => {
        const mockRequest = {
            onerror: null,
            onsuccess: null,
            onupgradeneeded: null,
            result: mockDb,
        };
        mockIDB.open.mockReturnValue(mockRequest);

        const initPromise = client.init();

        // Trigger success
        (mockRequest as any).onsuccess();
        await initPromise;

        expect(mockIDB.open).toHaveBeenCalledWith('TraderProDB', 1);
    });

    it('handles upgrade needed', async () => {
        const mockRequest = {
            onerror: null,
            onsuccess: null,
            onupgradeneeded: null,
            result: mockDb,
        };
        mockIDB.open.mockReturnValue(mockRequest);

        client.init();

        // Trigger upgrade
        const event = { target: { result: mockDb }, oldVersion: 0 };
        (mockRequest as any).onupgradeneeded(event);

        expect(mockDb.createObjectStore).toHaveBeenCalledWith('ohlcv_data');
    });

    it('returns early if already initialized', async () => {
        (client as any).db = mockDb;
        await client.init();
        expect(mockIDB.open).not.toHaveBeenCalled();
    });

    it('rejects if db is missing during operation', async () => {
        (client as any).db = null;
        // Mock init to not set db
        jest.spyOn(client, 'init').mockResolvedValue();
        await expect(client.getData('AAPL')).rejects.toBe('DB not initialized');
    });

    it('gets data successfully', async () => {
        const mockRequest = { onsuccess: null, result: [{ date: '2026-01-01' }] };
        mockStore.get.mockReturnValue(mockRequest);
        (client as any).db = mockDb;

        const getPromise = client.getData('AAPL');
        await Promise.resolve(); // Wait for init()
        (mockRequest as any).onsuccess();
        const data = await getPromise;

        expect(data).toHaveLength(1);
    });

    it('saves data successfully', async () => {
        const mockRequest = { onsuccess: null };
        mockStore.put.mockReturnValue(mockRequest);
        (client as any).db = mockDb;

        const data = [{ date: '2026-01-02' }, { date: '2026-01-01' }];
        const savePromise = client.saveData('AAPL', data as any);
        await Promise.resolve();
        (mockRequest as any).onsuccess();
        await savePromise;

        expect(mockStore.put).toHaveBeenCalled();
    });

    it('merges and saves data', async () => {
        const existing = [{ date: '2026-01-01', close: 100 }];
        const newData = [{ date: '2026-01-02', close: 105 }, { date: '2026-01-01', close: 101 }]; // overlap

        jest.spyOn(client, 'getData').mockResolvedValue(existing as any);
        const saveSpy = jest.spyOn(client, 'saveData').mockResolvedValue();

        const result = await client.mergeAndSave('AAPL', newData as any);

        expect(result).toHaveLength(2);
        expect(result[0].close).toBe(101); // overwritten
        expect(saveSpy).toHaveBeenCalled();
    });

    it('clears all data', async () => {
        const mockRequest = { onsuccess: null };
        mockStore.clear.mockReturnValue(mockRequest);
        (client as any).db = mockDb;

        const clearPromise = client.clearAllData();
        await Promise.resolve();
        (mockRequest as any).onsuccess();
        await clearPromise;

        expect(mockStore.clear).toHaveBeenCalled();
    });
});
