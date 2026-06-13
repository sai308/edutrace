import type { SessionType } from '@Sessions/models/session.model'

export interface Plan {
    id: string // Unique combination of studentId and sessionType or UUID
    studentId: string
    iep: string // Extracted from student.iep
    grade: number | null
    dateApplied: string // ISO date string
    sessionType: SessionType
    isSynced: boolean
    syncedAt: string | null // ISO date string
}
