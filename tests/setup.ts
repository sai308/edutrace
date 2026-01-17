import { beforeEach, vi } from 'vitest';
import { databaseService, DEFAULT_DB_NAME } from '../src/shared/services/DatabaseService';
import 'fake-indexeddb/auto';

// Mock Worker globally for JSDOM
if (typeof Worker === 'undefined') {
    (global as any).Worker = class MockWorker implements Partial<Worker> {
        onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
        onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
        constructor() { }
        postMessage(message: any): void { }
        terminate(): void { }
        addEventListener(): void { }
        removeEventListener(): void { }
        dispatchEvent(): boolean { return true; }
    };
}

// Define a mock implementation for the File constructor
class FileMock {
    chunks: BlobPart[];
    fileName: string;
    options: FilePropertyBag;

    constructor(chunks: BlobPart[], fileName: string, options: FilePropertyBag = {}) {
        this.chunks = chunks;
        this.fileName = fileName;
        this.options = options;
    }

    get size(): number {
        return this.chunks.reduce((acc, chunk) => {
            if (typeof chunk === 'string') return acc + chunk.length;
            if (chunk instanceof ArrayBuffer) return acc + chunk.byteLength;
            if (chunk instanceof Blob) return acc + chunk.size;
            return acc;
        }, 0);
    }

    async text(): Promise<string> {
        const parts = await Promise.all(this.chunks.map(async chunk => {
            if (typeof chunk === 'string') return chunk;
            if (chunk instanceof Blob) return await chunk.text();
            return '';
        }));
        return parts.join('');
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        return new ArrayBuffer(0);
    }

    slice(): FileMock {
        return this;
    }
}

vi.stubGlobal('File', FileMock)

// Optional helper if you want a single place to maintain DB names
const TEST_DB_NAMES = [
    DEFAULT_DB_NAME,
    'test-migration-groups',
    'test-migration-tasks',
    'test-migration-marks',
    'test-migration-students',
];

async function resetIndexedDb() {
    // best-effort cleanup: delete all known DBs
    // With fake-indexeddb, we might need to be careful, but deleteDatabase works.
    for (const name of TEST_DB_NAMES) {
        try {
            indexedDB.deleteDatabase(name);
        } catch {
            // ignore in tests
        }
    }
}

beforeEach(async () => {
    // reset db connection
    await databaseService.resetConnection();

    // reset indexeddb
    await resetIndexedDb();

    // jsdom localStorage – safe & test-only
    localStorage.clear();
    sessionStorage.clear();

    // Drop cached modules so repository singletons are rebuilt per test
    vi.resetModules();
});
