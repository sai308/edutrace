import type { IndexNames, StoreKey, StoreNames, StoreValue } from 'idb'
import type { IDBCustomSchema } from './DatabaseService'
import { databaseService } from './DatabaseService'

export interface PageOptions {
    limit?: number
    offset?: number
}

/**
 * T extends StoreNames<IDBCustomSchema> ensures we only pass valid store names
 * defined in our database schema.
 */
export class BaseRepository<T extends StoreNames<IDBCustomSchema>> {
    protected storeName: T

    constructor(storeName: T) {
        this.storeName = storeName
    }

    /**
     * Get database instance with the pre-defined schema
     */
    async getDb() {
        return databaseService.getDb()
    }

    /**
     * Get all items from the store
     */
    async getAll(): Promise<StoreValue<IDBCustomSchema, T>[]> {
        const db = await this.getDb()
        return db.getAll(this.storeName)
    }

    /**
     * Get a single item by its primary key
     */
    async getById(
        id: StoreKey<IDBCustomSchema, T>,
    ): Promise<StoreValue<IDBCustomSchema, T> | undefined> {
        const db = await this.getDb()
        return db.get(this.storeName, id)
    }

    /**
     * Add a new item (fails if key exists)
     */
    async add(item: StoreValue<IDBCustomSchema, T>): Promise<StoreKey<IDBCustomSchema, T>> {
        const db = await this.getDb()
        return db.add(this.storeName, item)
    }

    /**
     * Update or add an item
     */
    async put(item: StoreValue<IDBCustomSchema, T>): Promise<StoreKey<IDBCustomSchema, T>> {
        const db = await this.getDb()
        return db.put(this.storeName, item)
    }

    /**
     * Delete an item by its primary key
     */
    async delete(id: StoreKey<IDBCustomSchema, T>): Promise<void> {
        const db = await this.getDb()
        return db.delete(this.storeName, id)
    }

    /**
     * Get all items matching an index query.
     * Pass `count` to cap the number of records returned (useful for existence checks
     * where you only need 1 result, or for capped display queries).
     */
    async getAllFromIndex(
        indexName: IndexNames<IDBCustomSchema, T>,
        query: IDBKeyRange | any = null,
        count?: number,
    ): Promise<StoreValue<IDBCustomSchema, T>[]> {
        const db = await this.getDb()
        return db.getAllFromIndex(this.storeName, indexName, query, count)
    }

    /**
     * Get the first item matching an index query
     */
    async getFromIndex(
        indexName: IndexNames<IDBCustomSchema, T>,
        query: IDBKeyRange | any,
    ): Promise<StoreValue<IDBCustomSchema, T> | undefined> {
        const db = await this.getDb()
        return db.getFromIndex(this.storeName, indexName, query)
    }

    /**
     * Cursor-based paginated query over an index. Supports both `limit` and `offset`,
     * unlike `getAllFromIndex` which can only cap from the start with `count`.
     * Use this for display queries that don't need the full result set.
     */
    async getManyFromIndex(
        indexName: IndexNames<IDBCustomSchema, T>,
        query: IDBKeyRange | any,
        { limit, offset = 0 }: PageOptions = {},
    ): Promise<StoreValue<IDBCustomSchema, T>[]> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readonly')
        let cursor = await tx
            .objectStore(this.storeName)
            .index(indexName as any)
            .openCursor(query)

        if (offset > 0 && cursor) {
            cursor = (await cursor.advance(offset)) ?? null
        }

        const results: StoreValue<IDBCustomSchema, T>[] = []
        while (cursor) {
            if (limit !== undefined && results.length >= limit) break
            results.push(cursor.value as StoreValue<IDBCustomSchema, T>)
            cursor = (await cursor.continue()) ?? null
        }

        return results
    }

    /**
     * Perform multiple puts in a single transaction
     */
    async bulkPut(items: StoreValue<IDBCustomSchema, T>[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        await Promise.all(items.map((item) => store.put(item)))
        await tx.done
    }

    /**
     * Perform multiple deletes in a single transaction
     */
    async bulkDelete(ids: StoreKey<IDBCustomSchema, T>[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        await Promise.all(ids.map((id) => store.delete(id)))
        await tx.done
    }
}
