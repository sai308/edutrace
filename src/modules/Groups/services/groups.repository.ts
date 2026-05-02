import type { Group } from '../types/groups'
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
}

export const groupsRepository = new GroupsRepository()
