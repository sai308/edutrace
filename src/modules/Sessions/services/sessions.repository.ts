import type { SessionReport, SessionType } from '@Sessions/models/session.model'
import { SessionStatusEnum, SessionTypeEnum } from '@Sessions/models/session.model'
import { v4 as uuidv4 } from 'uuid'
import { BaseRepository } from '@/shared/services/BaseRepository'

export class SessionRepository extends BaseRepository<'sessions'> {
    constructor() {
        super('sessions')
    }

    private _validateSession(session: Omit<SessionReport, 'id'>): void {
        if (!session.groupId) throw new Error('SessionReport.groupId is required')
        if (!session.sessionType || !Object.values(SessionTypeEnum).includes(session.sessionType)) {
            throw new Error(`SessionReport.sessionType must be one of: ${Object.values(SessionTypeEnum).join(', ')}`)
        }
        if (!session.status || !Object.values(SessionStatusEnum).includes(session.status)) {
            throw new Error(`SessionReport.status must be one of: ${Object.values(SessionStatusEnum).join(', ')}`)
        }
        if (!Array.isArray(session.entries)) {
            throw new TypeError('SessionReport.entries must be an array')
        }
    }

    /**
     * Create a new session report after validating required fields.
     */
    async create(session: Omit<SessionReport, 'id'>): Promise<SessionReport> {
        this._validateSession(session)
        const newSession: SessionReport = {
            ...session,
            id: uuidv4(),
        }
        await this.add(newSession)
        return newSession
    }

    /**
     * Get all sessions for a group.
     */
    async getByGroupId(groupId: string): Promise<SessionReport[]> {
        return this.getAllFromIndex('groupId', groupId)
    }

    /**
     * Get a specific session for a group by type via the composite index.
     */
    async getGroupSession(groupId: string, sessionType: SessionType): Promise<SessionReport | undefined> {
        return this.getFromIndex('group_type', [groupId, sessionType])
    }
}

export const sessionRepository = new SessionRepository()
