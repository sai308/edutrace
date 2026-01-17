/**
 * StorageService
 * 
 * Unified adapter for LocalStorage and SessionStorage.
 * Handles:
 * - JSON serialization/deserialization
 * - Error handling (e.g., quota exceeded)
 * - Type safety defaults
 */

class StorageAdapter {
    private storage: Storage;

    /**
     * @param {Storage} storage - localStorage or sessionStorage
     */
    constructor(storage: Storage) {
        this.storage = storage;
    }

    /**
     * Get a value from storage.
     * Automatically parses JSON.
     * @param {string} key 
     * @param {T | null} defaultValue 
     * @returns {T | string | null}
     */
    get<T = any>(key: string, defaultValue: T | null = null): T | string | null {
        try {
            const item = this.storage.getItem(key);
            if (item === null) return defaultValue;

            // Attempt to parse JSON
            try {
                return JSON.parse(item) as T;
            } catch (e) {
                // If parse fails, return the raw string.
                return item;
            }
        } catch (e) {
            console.error(`StorageService: Error getting key '${key}'`, e);
            return defaultValue;
        }
    }

    /**
     * Set a value in storage.
     * Automatically stringifies objects.
     * @param {string} key 
     * @param {any} value 
     */
    set(key: string, value: any): void {
        try {
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            this.storage.setItem(key, stringValue);
        } catch (e) {
            console.error(`StorageService: Error setting key '${key}'`, e);
        }
    }

    /**
     * Remove a value from storage.
     * @param {string} key 
     */
    remove(key: string): void {
        try {
            this.storage.removeItem(key);
        } catch (e) {
            console.error(`StorageService: Error removing key '${key}'`, e);
        }
    }

    /**
     * Clear all keys in this storage.
     */
    clear(): void {
        try {
            this.storage.clear();
        } catch (e) {
            console.error('StorageService: Error clearing storage', e);
        }
    }
}

export const local = new StorageAdapter(window.localStorage);
export const session = new StorageAdapter(window.sessionStorage);

export default {
    local,
    session
};
