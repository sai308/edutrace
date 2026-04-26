---
name: scaffold-service-test
description: Generate a Vitest test file for an EduTrace service. Use this skill whenever the user wants to add tests for a service, create a service test file, write unit tests for a service class, or test a repository. Always invoke this skill rather than writing test boilerplate manually — the mock setup for repositories and Comlink workers is error-prone and must follow the project's established patterns.
---

# scaffold-service-test

Generates a `services/tests/<name>.service.test.ts` file for a given service, using the correct mock setup for the project's Vitest + fake-indexeddb environment.

## Step 1 — Read the service first

Before writing a single line, read the target service file. You need to know:
- Which **repositories** it imports (mock each one with `vi.mock()`)
- Whether it uses a **Web Worker via Comlink** (requires the hoisted mock pattern)
- What **public methods** it exposes (each gets a `describe` block)
- What **validation or error paths** exist (each gets an `it` case)

## Step 2 — Choose the right template

### Template A — Plain service (no worker)

Use this when the service only calls repositories directly (like `GroupsService` without aggregation, `StudentsService`).

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { <name>Service } from '../<name>.service';
import { <name>Repository } from '../<name>.repository';
// import other repositories the service uses

vi.mock('../<name>.repository');
// vi.mock('path/to/other.repository');

describe('<Name>Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('<methodName>', () => {
        it('should <expected behaviour>', async () => {
            (<name>Repository.<method> as any).mockResolvedValue(<mockData>);

            const result = await <name>Service.<methodName>(<args>);

            expect(<name>Repository.<method>).toHaveBeenCalledWith(
                expect.objectContaining({ ... })
            );
            expect(result).<assertion>;
        });
    });
});
```

### Template B — Service with Comlink Worker

Use this when the service wraps a worker with `wrap(new SomeWorker())`. Requires `vi.hoisted()` for the mock function and a separate Worker class mock.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { <Name>Service } from '../<name>.service';
import { <name>Repository } from '../<name>.repository';
// import other repositories

// Worker must be stubbed before the module is imported
if (typeof Worker === 'undefined') {
    (globalThis as any).Worker = class {
        constructor() {}
        postMessage() {}
        onmessage() {}
        terminate() {}
    };
}

vi.mock('../<name>.repository');
// vi.mock other repos...

vi.mock('@/workers/<name>.worker?worker', () => ({
    default: class MockWorker {}
}));

// vi.hoisted ensures the mock fn is created before vi.mock factories run
const { mock<WorkerMethod> } = vi.hoisted(() => ({
    mock<WorkerMethod>: vi.fn()
}));

vi.mock('comlink', () => ({
    wrap: vi.fn().mockReturnValue({
        <workerMethod>: mock<WorkerMethod>
    }),
    expose: vi.fn()
}));

describe('<Name>Service', () => {
    let service: <Name>Service;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new <Name>Service(); // instantiate fresh (creates new worker proxy)
    });

    describe('<methodName>', () => {
        it('should delegate to worker after fetching data', async () => {
            (<name>Repository.<method> as any).mockResolvedValue(<mockData>);
            mock<WorkerMethod>.mockResolvedValue(<workerResult>);

            const result = await service.<methodName>(<args>);

            expect(mock<WorkerMethod>).toHaveBeenCalledWith(<expectedArgs>);
            expect(result).toEqual(<workerResult>);
        });
    });
});
```

## Step 3 — Write meaningful test cases

For each public method, write at minimum:
- **Happy path** — normal inputs, verify the right repos/worker methods were called and the return value is correct
- **Validation / error path** — if the service throws on bad input, verify it does

Good assertion patterns from the codebase:
```typescript
// Partial object match (ignore auto-generated id, timestamps)
expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'X' }));

// Check a field was auto-generated
expect(result.id).toBeDefined();

// Natural sort order
expect(result[0]?.name).toBe('Group 1');
expect(result[2]?.name).toBe('Group 10');

// Error thrown
await expect(service.save({ name: '' } as any)).rejects.toThrow('required');
```

## Step 4 — Resolve mock paths correctly

`vi.mock()` paths must be **relative from the test file**, not from the service. The test lives in `services/tests/`, so:

| Import in service | `vi.mock()` path in test |
|---|---|
| `'../marks.repository'` | `'../marks.repository'` (same — relative to test) |
| `'@Tasks/services/tasks.repository'` | `'../../../Tasks/services/tasks.repository'` or the alias path — either works |
| `'@/shared/services/settings.repository'` | `'@/shared/services/settings.repository'` (alias paths work directly) |

When in doubt, use the alias (`@/`, `@Tasks/`, etc.) — Vitest resolves them via vite config.

## Step 5 — Run and verify

```bash
pnpm vitest run src/modules/<Name>/services/tests/<name>.service.test.ts
```

Fix any import resolution errors before marking done. Common issues:
- Missing `vi.mock('comlink')` when the service imports it transitively
- Worker stub placed after `vi.mock()` calls — it must come before, or be inside the hoisted block
- Using singleton `<name>Service` (exported instance) vs. instantiating `new <Name>Service()` — services with workers must be instantiated in `beforeEach` so each test gets a fresh Comlink proxy
