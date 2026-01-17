import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { databaseService, DEFAULT_DB_NAME } from '../DatabaseService';
import 'fake-indexeddb/auto'; // Uses memory-based IDB

describe('DatabaseService', () => {
    beforeEach(async () => {
        // Reset connection and ensure clean state if possible
        await databaseService.resetConnection();
    });

    afterEach(async () => {
        await databaseService.resetConnection();
    });

    it('should connect to the default database when no workspace is active', async () => {
        const db = await databaseService.getDb();
        expect(db).toBeDefined();
        expect(db.name).toBe(DEFAULT_DB_NAME);
        expect(db.objectStoreNames.contains('meets')).toBe(true);
    });

    it('should initialize all required object stores', async () => {
        const db = await databaseService.getDb();
        const stores = ['meets', 'groups', 'tasks', 'marks', 'members', 'modules', 'finalAssessments', 'settings'];

        stores.forEach(store => {
            expect(db.objectStoreNames.contains(store)).toBe(true);
        });
    });

    it('should allow simple read/write operations', async () => {
        const db = await databaseService.getDb();

        // Test 'settings' store
        await db.put('settings', { key: 'test_key', value: 123 });
        const val = await db.get('settings', 'test_key');
        expect(val).toEqual({ key: 'test_key', value: 123 });
    });
});
