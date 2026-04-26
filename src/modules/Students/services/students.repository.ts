import type { Meet } from '@Analytics/types/analytics'
import type { Member } from '../types/students'
import { BaseRepository } from '@/shared/services/BaseRepository'

class StudentsRepository extends BaseRepository<'members'> {
    constructor() {
        super('members')
    }

    async saveMember(member: Member): Promise<string> {
        if (member.role === 'teacher' || member.role === 'assistant') {
            member.groupName = null
            member.iep = undefined
        }
        if (member.id) {
            await this.put(member)
            return member.id
        }
        return this.add(member)
    }

    async getAllMembers(options: { includeHidden?: boolean } = {}): Promise<Member[]> {
        const members = await this.getAll()
        if (options.includeHidden) {
            return members
        }
        return members.filter((m) => !m.hidden) // Filter hidden members by default
    }

    /**
     * Returns a map of studentId → IEP string for all members that have an IEP set.
     * Used by Sessions to resolve the live IEP at print/export time without storing
     * it in the immutable SessionStudentSnapshot.
     */
    async getIepMap(options: { includeHidden?: boolean } = {}): Promise<Record<string, string>> {
        const members = await this.getAllMembers(options)
        return Object.fromEntries(members.filter((m) => m.iep).map((m) => [m.id, m.iep as string]))
    }

    async getMembersByGroup(groupName: string): Promise<Member[]> {
        // Use the index on 'groupName' directly
        const members = await this.getAllFromIndex('groupName', groupName)
        return members.filter((m) => !m.hidden)
    }

    async deleteMembers(ids: string[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        await Promise.all(ids.map((id) => store.delete(id)))
        await tx.done
    }

    async syncAllMembersFromMeets(): Promise<number> {
        const db = await this.getDb()

        // This functionality needs access to Meets repo or raw DB access
        // Since we are in the repo layer, we can access 'meets' store via DB or inject MeetRepo.
        // For simplicity/performance in this batch operation, direct DB access is fine inside the service layer
        // BUT ideally we should decouple.
        // Let's stick to direct DB for now as it was in original.

        const allMeets = await db.getAll('meets')
        const existingMembers = await this.getAll()
        const membersMap = new Map<string, Member>() // Key: name, Value: member

        existingMembers.forEach((m) => membersMap.set(m.name, m))

        let addedCount = 0
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        for (const meet of allMeets) {
            if (!meet.participants) continue

            for (const participant of meet.participants) {
                if (!membersMap.has(participant.name)) {
                    const newMember: Member = {
                        id: crypto.randomUUID(),
                        name: participant.name,
                        groupName: meet.groupName || 'Unknown', // Inferred from meet
                        role: 'student',
                        createdAt: new Date().toISOString(),
                    }
                    // Add to map to prevent duplicates in this run
                    membersMap.set(participant.name, newMember)
                    await store.add(newMember)
                    addedCount++
                }
            }
        }
        await tx.done
        return addedCount
    }

    async hideMember(id: string): Promise<string | undefined> {
        const member = await this.getById(id)
        if (member) {
            member.hidden = true
            return this.put(member)
        }
    }

    async hideMembers(ids: string[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        for (const id of ids) {
            const member = await store.get(id)
            if (member) {
                member.hidden = true
                await store.put(member)
            }
        }
        await tx.done
    }

    async restoreMember(id: string): Promise<string | undefined> {
        const member = await this.getById(id)
        if (member) {
            member.hidden = false
            return this.put(member)
        }
    }

    async restoreMembers(ids: string[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        for (const id of ids) {
            const member = await store.get(id)
            if (member) {
                member.hidden = false
                await store.put(member)
            }
        }
        await tx.done
    }

    async clearMembers(): Promise<void> {
        const db = await this.getDb()
        return db.clear(this.storeName)
    }

    /**
     * Sync participants from a list of meets for a specific group.
     */
    async syncParticipants(meets: Meet[], groupName: string): Promise<void> {
        // Build map of existing members to avoid duplicates
        const existingMembers = await this.getAll()
        const memberMap = new Map<string, Member>()
        existingMembers.forEach((m) => {
            memberMap.set(m.name, m)
            if (m.aliases) {
                m.aliases.forEach((a: string) => memberMap.set(a, m))
            }
        })

        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        for (const meet of meets) {
            if (!meet.participants) continue
            for (const p of meet.participants) {
                if (!memberMap.has(p.name)) {
                    const newMember: Member = {
                        id: crypto.randomUUID(),
                        name: p.name,
                        groupName,
                        email: p.email || '',
                        role: 'student',
                        aliases: [],
                        hidden: false,
                        createdAt: new Date().toISOString(),
                    }
                    const id = await store.add(newMember)
                    newMember.id = id
                    memberMap.set(p.name, newMember) // Update map for subsequent iterations
                }
            }
        }
        await tx.done
    }
}

export const studentsRepository = new StudentsRepository()
