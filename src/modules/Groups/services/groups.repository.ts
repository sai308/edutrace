import type { Group } from '../types/groups'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { BaseRepository } from '@/shared/services/BaseRepository'

class GroupsRepository extends BaseRepository<'groups'> {
    constructor() {
        super('groups')
    }

    async getGroups(): Promise<Group[]> {
        return this.getAll()
    }

    async saveGroup(group: Group): Promise<string | number> {
        if (!group.name || !group.meetId) {
            throw new Error('saveGroup: group must have a name and meetId')
        }

        let id: string | number
        if (group.id) {
            await this.put(group)
            id = group.id
        }
        else {
            id = await this.add(group)
            group.id = id
        }

        // Sync members from existing meets for this group (side effect)
        await this.syncMembersFromMeets(group)
        return id
    }

    async deleteGroup(id: string | number): Promise<void> {
        if (!id && id !== 0) {
            throw new Error('deleteGroup: id must be a non-empty value')
        }
        return this.delete(id)
    }

    async getGroupMap(): Promise<Record<string, Group>> {
        const groups = await this.getAll()
        const map: Record<string, Group> = {}
        groups.forEach((g) => {
            map[g.meetId] = g
        })
        return map
    }

    async syncMembersFromMeets(group: Group): Promise<void> {
        if (!group.meetId)
            return
        const meets = await meetsRepository.getMeetsByMeetId(group.meetId)
        await studentsRepository.syncParticipants(meets, group.name)
    }
}

export const groupsRepository = new GroupsRepository()
