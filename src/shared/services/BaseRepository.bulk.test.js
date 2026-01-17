
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository } from './BaseRepository';
// We need to mock databaseService or use a fake one.
// Since BaseRepository imports databaseService singleton, we should mock that module.

import 'fake-indexeddb/auto';
import { openDB } from 'idb';

// Mock the databaseService to return a real (fake) IDB instance
const dbName = 'test-db';
const storeName = 'test-store';

// We need to setup a real IDB using fake-indexeddb
async function setupDb() {
    return openDB(dbName, 1, {
        upgrade(db) {
            db.createObjectStore(storeName, { keyPath: 'id' });
        },
    });
}

// Mock the module
vi.mock('./DatabaseService', () => {
    let dbInstance = null;
    return {
        databaseService: {
            getDb: async () => {
                if (!dbInstance) {
                    dbInstance = await setupDb();
                }
                return dbInstance;
            }
        }
    };
});

describe('BaseRepository Bulk Operations', () => {
    let repo;

    beforeEach(async () => {
        // Reset DB or cleared
        const db = await setupDb();
        await db.clear(storeName);
        repo = new BaseRepository(storeName);
    });

    it('should bulkPut items correctly', async () => {
        const items = [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' },
            { id: '3', name: 'Item 3' }
        ];

        await repo.bulkPut(items);

        const all = await repo.getAll();
        expect(all).toHaveLength(3);
        expect(all.find(i => i.id === '1')).toEqual({ id: '1', name: 'Item 1' });
        expect(all.find(i => i.id === '2')).toEqual({ id: '2', name: 'Item 2' });
    });

    it('should bulkDelete items correctly', async () => {
        // Seed
        await repo.bulkPut([
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' },
            { id: '3', name: 'Item 3' }
        ]);

        await repo.bulkDelete(['1', '3']);

        const all = await repo.getAll();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe('2');
    });
});
