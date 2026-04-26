---
name: add-migration
description: Add a new IndexedDB schema migration to EduTrace. Use this skill whenever the user wants to add a new object store, add or remove an index on an existing store, rename a field, transform existing records, delete a legacy store, or bump the database version. Always invoke this skill rather than editing DatabaseService.ts or Database.d.ts manually — the two files must be updated together and the version bump must be correct.
---

# add-migration

Updates two files together:
- `src/shared/services/DatabaseService.ts` — version constant + `initSchema` migration block
- `src/shared/types/Database.d.ts` — `IDBCustomSchema` type definition

**Current version**: `DB_VERSION = 17`. Every migration bumps this by 1.

## Step 1 — Clarify the change

Ask the user (if not already clear):
1. What is changing? (new store / new index / remove index / data transform / delete store)
2. For a **new store**: store name, key type (`string` | `number` with `autoIncrement`), indexes needed (name, unique?)
3. For a **new index**: which store, index name, field path, unique?
4. For a **data transform**: what field changes? (rename, compute, delete)
5. Does the new store need a repository? (if yes, remind the user to use `scaffold-module` or `scaffold-repository`)

## Step 2 — Make the changes

Always read both files first, then edit. Make all changes before validating.

### 2a. Bump `DB_VERSION` in DatabaseService.ts

```ts
// Before
export const DB_VERSION = 17;
// After
export const DB_VERSION = 18;
```

### 2b. Add the migration block in `initSchema`

Add it in the appropriate section of `initSchema`. Follow the existing patterns exactly:

**New store** — use the "does not exist yet" guard:
```ts
if (!db.objectStoreNames.contains('<storeName>')) {
    const store = db.createObjectStore('<storeName>', { keyPath: 'id', autoIncrement: true });
    store.createIndex('<indexName>', '<fieldPath>', { unique: false });
    // ... more indexes
}
```

For string keys (no autoIncrement):
```ts
db.createObjectStore('<storeName>', { keyPath: 'id' });
```

**New index on existing store** — use `else if (oldVersion < N)` after the store's creation block:
```ts
} else if (oldVersion < 18) {
    const store = transaction.objectStore('<storeName>');
    if (!store.indexNames.contains('<indexName>')) {
        store.createIndex('<indexName>', '<fieldPath>', { unique: false });
    }
}
```

**Remove index** — inside an `else if (oldVersion < N)` block:
```ts
if (store.indexNames.contains('<indexName>')) {
    store.deleteIndex('<indexName>');
}
```

**Cursor-based data transform** — use a cursor loop inside the migration block:
```ts
let cursor = await store.openCursor();
while (cursor) {
    const record = { ...cursor.value } as any;
    // mutate record
    await cursor.update(record);
    cursor = await cursor.continue();
}
```

**Delete legacy store**:
```ts
if (oldVersion < 18 && db.objectStoreNames.contains('<storeName>' as any)) {
    db.deleteObjectStore('<storeName>' as any);
}
```

**Composite index**:
```ts
store.createIndex('<name>', ['<field1>', '<field2>'], { unique: true });
```

### 2c. Update `IDBCustomSchema` in Database.d.ts

For a **new store**, add the entry to the interface:
```ts
<storeName>: {
    key: number;           // or string
    value: <EntityType>;
    indexes: { <indexName>: <keyType>; ... };  // omit 'indexes' if none
};
```

For a new type reference, add the import at the top of the file.

For a **deleted store**, remove its entry (or mark it as legacy with `key: any; value: any`).

For index changes, update the `indexes` object accordingly.

## Step 3 — Validate

Run the type-check to catch schema mismatches:
```bash
pnpm check
```

If the new store needs a `BaseRepository` subclass and the user hasn't created one yet, remind them.

## Common mistakes to avoid

- Forgetting to update `IDBCustomSchema` after adding a store — `BaseRepository<'storeName'>` will fail at compile time with an unknown store name
- Putting a data-transform cursor loop inside a `!db.objectStoreNames.contains()` branch — it must be in the `else if (oldVersion < N)` branch (store already exists for upgrading users)
- Not wrapping existing-store changes in `else if (oldVersion < N)` — this causes re-running migrations on fresh installs where the store was just created with the correct schema
- Using `as any` on store names that should be properly typed — only acceptable for truly legacy/deleted stores
