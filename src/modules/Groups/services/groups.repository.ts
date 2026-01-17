import { BaseRepository } from '@/shared/services/BaseRepository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { studentsRepository } from '@Students/services/students.repository';
import type { Group } from '../types/groups';

class GroupsRepository extends BaseRepository<'groups'> {
    constructor() {
        super('groups');
    }

    async getGroups(): Promise<Group[]> {
        return this.getAll();
    }

    async saveGroup(group: Group): Promise<number | string> {
        let id: string | number;
        if (group.id) {
            await this.put(group);
            id = group.id;
        } else {
            id = await this.add(group);
            group.id = id as number; // Ensure ID is set for sync
        }

        // Sync members from existing meets for this group (side effect)
        if (group.meetId) {
            await this.syncMembersFromMeets(group);
        }
        return id;
    }

    async deleteGroup(id: string | number): Promise<void> {
        return this.delete(id as any);
    }

    async getGroupMap(): Promise<Record<string, Group>> {
        const groups = await this.getAll();
        const map: Record<string, Group> = {};
        groups.forEach(g => {
            map[g.meetId] = g;
        });
        return map;
    }

    async syncMembersFromMeets(group: Group): Promise<void> {
        const meets = await meetsRepository.getMeetsByMeetId(group.meetId);
        await studentsRepository.syncParticipants(meets, group.name);
    }
}

export const groupsRepository = new GroupsRepository();
