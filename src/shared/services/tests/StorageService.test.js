import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { local, session } from '../StorageService';

describe('StorageService', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    describe('Local Storage', () => {
        it('should save and retrieve strings', () => {
            local.set('test_key', 'hello');
            const val = local.get('test_key');
            expect(val).toBe('hello');
        });

        it('should save and retrieve objects as JSON', () => {
            const obj = { id: 1, name: 'Test' };
            local.set('test_obj', obj);
            const val = local.get('test_obj');
            expect(val).toEqual(obj);
        });

        it('should return default value if key missing', () => {
            const val = local.get('missing', 'default');
            expect(val).toBe('default');
        });

        it('should remove items', () => {
            local.set('k', 'v');
            local.remove('k');
            expect(local.get('k')).toBeNull();
        });

        it('should handle JSON parse errors gracefully by returning raw string or default', () => {
            localStorage.setItem('bad_json', '{ bad: json }');
            // If parse fails, get() catches and might return item or default. 
            // The implementation returns 'item' (the raw string) if parse fails.
            const val = local.get('bad_json');
            expect(val).toBe('{ bad: json }');
        });
    });

    describe('Session Storage', () => {
        it('should save and retrieve numbers', () => {
            session.set('num', 123);
            const val = session.get('num');
            expect(val).toBe(123);
        });
    });
});
