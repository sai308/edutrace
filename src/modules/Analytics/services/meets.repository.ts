import { BaseRepository } from '@/shared/services/BaseRepository';
import type { Meet, Participant } from '../types/analytics';

class MeetsRepository extends BaseRepository<'meets'> {
    constructor() {
        super('meets');
    }

    async saveMeet(meetData: Meet): Promise<string> {
        return this.put(meetData);
    }

    async getAllMeets(): Promise<Meet[]> {
        return this.getAll();
    }

    async getMeetsByMeetId(meetId: string): Promise<Meet[]> {
        return this.getAllFromIndex('meetId', meetId);
    }

    async getMeetById(id: string): Promise<Meet | undefined> {
        return this.getById(id);
    }

    async checkMeetExists(meetId: string, date: string): Promise<boolean> {
        const meets = await this.getAllFromIndex('meetId', meetId);
        return meets.some(m => m.date === date);
    }

    async isDuplicateFile(filename: string, meetId: string, date: string): Promise<boolean> {
        const meets = await this.getAllFromIndex('meetId', meetId);
        // Check if consistent date AND filename match
        return meets.some(m => m.date === date && m.filename === filename);
    }

    async deleteMeets(ids: string[]): Promise<void> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        await Promise.all(ids.map(id => store.delete(id)));
        await tx.done;
    }

    async applyDurationLimitToAll(limitMinutes: number): Promise<number> {
        if (!limitMinutes || limitMinutes <= 0) return 0;

        const limitSeconds = limitMinutes * 60;
        const db = await this.getDb();

        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const meets: Meet[] = await store.getAll();

        let fixedCount = 0;

        for (const meet of meets) {
            let changed = false;
            if (meet.participants) {
                meet.participants.forEach((p: Participant) => {
                    if (p.duration > limitSeconds) {
                        p.duration = limitSeconds;
                        changed = true;
                    }
                });
            }

            if (changed) {
                await store.put(meet);
                fixedCount++;
            }
        }

        await tx.done;
        return fixedCount;
    }
}

export const meetsRepository = new MeetsRepository();
