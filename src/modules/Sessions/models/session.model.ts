export type SessionType = 'MAIN' | 'FIRST_RETAKE' | 'SECOND_RETAKE'

export const SessionTypeEnum = {
    MAIN: 'MAIN',
    FIRST_RETAKE: 'FIRST_RETAKE',
    SECOND_RETAKE: 'SECOND_RETAKE',
} as const

export type SessionStatus = 'OPEN' | 'CLOSED'

export const SessionStatusEnum = {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
} as const

export type GradeType = 'AUTO' | 'MANUAL'

export const GradeTypeEnum = {
    AUTO: 'AUTO',
    MANUAL: 'MANUAL',
} as const

export interface SessionStudentSnapshot {
    id: string // The original student ID
    fullName: string
    groupName?: string
}

export interface SessionEntry {
    studentId: string
    studentSnapshot: SessionStudentSnapshot
    // Grade must be consistently stored in a 100-point fixed scale.
    // It will be converted for display according to the selected grade scale.
    grade: number | null
    gradeType: GradeType
    updatedAt: string // ISO date string
}

export interface SessionReport {
    id: string // generated UUID or similar
    sessionType: SessionType
    status: SessionStatus
    groupId: string // ID of the group this session belongs to
    openedAt: string // ISO date string
    closedAt: string | null // ISO date string, null if open
    entries: SessionEntry[]
}
