import type { Meet, Participant } from '../types/analytics'
import { BaseRepository } from '@/shared/services/BaseRepository'

class MeetsRepository extends BaseRepository<'meets'> {
    constructor() {
        super('meets')
    }

    async saveMeet(meetData: Meet): Promise<string> {
        if (!meetData || !meetData.meetId) {
            throw new Error('saveMeet: meetData must have a meetId')
        }
        return this.put(meetData)
    }

    async getAllMeets(): Promise<Meet[]> {
        return this.getAll()
    }

    async getMeetsByMeetId(meetId: string): Promise<Meet[]> {
        if (!meetId || typeof meetId !== 'string') return []
        return this.getAllFromIndex('meetId', meetId)
    }

    async getMeetById(id: string): Promise<Meet | undefined> {
        if (!id || typeof id !== 'string') return undefined
        return this.getById(id)
    }

    async checkMeetExists(meetId: string, date: string): Promise<boolean> {
        if (!meetId || !date) return false
        const db = await this.getDb()
        let cursor = await db.transaction('meets').store.index('meetId').openCursor(meetId)
        while (cursor) {
            if (cursor.value.date === date) return true
            cursor = (await cursor.continue()) ?? null
        }
        return false
    }

    async isDuplicateFile(filename: string, meetId: string, date: string): Promise<boolean> {
        if (!filename || !meetId || !date) return false
        const db = await this.getDb()
        let cursor = await db.transaction('meets').store.index('meetId').openCursor(meetId)
        while (cursor) {
            const m = cursor.value
            if (m.date === date && m.filename === filename) return true
            cursor = (await cursor.continue()) ?? null
        }
        return false
    }

    async deleteMeets(ids: string[]): Promise<void> {
        if (!ids || ids.length === 0) return
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        await Promise.all(ids.map((id) => store.delete(id)))
        await tx.done
    }

    /**
     * Caps every participant's duration to limitMinutes across all stored meets.
     * Returns the number of meet records that were modified.
     */
    async applyDurationLimitToAll(limitMinutes: number): Promise<number> {
        if (typeof limitMinutes !== 'number' || !isFinite(limitMinutes) || limitMinutes <= 0) {
            return 0
        }

        const limitSeconds = limitMinutes * 60
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const meets: Meet[] = await store.getAll()

        let fixedCount = 0

        for (const meet of meets) {
            let changed = false
            if (Array.isArray(meet.participants)) {
                meet.participants.forEach((p: Participant) => {
                    if (typeof p.duration === 'number' && p.duration > limitSeconds) {
                        p.duration = limitSeconds
                        changed = true
                    }
                })
            }
            if (changed) {
                await store.put(meet)
                fixedCount++
            }
        }

        await tx.done
        return fixedCount
    }
}

export const meetsRepository = new MeetsRepository()
