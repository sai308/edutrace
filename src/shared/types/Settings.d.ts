// Reserved for future exam-specific configuration; shape is not yet defined.
export type ExamSettings = Record<string, unknown>

export interface PrintSettings {
    subject?: string
    studyForm?: string
    specialty?: string
    formOfControl?: string
    semester?: string
    academicYear?: string
    totalHours?: number
    examiner?: string
    practicalTeacher?: string
    templateFileName?: string
}

export interface SummaryThresholds {
    completionThreshold: number
    attendanceThreshold: number
    attendanceEnabled: boolean
    requiredTasks: number
}

export interface SettingsMap {
    durationLimit: number
    defaultTeacher: string | null
    ignoredUsers: string[]
    teachers: string[]
    sessionSquash: boolean
    sessionSquashThreshold: number
    examSettings: ExamSettings
    printSettings: PrintSettings
    /** Eligibility thresholds per group, keyed by group ID */
    summaryThresholds: Record<string, SummaryThresholds>
}

export type SettingKey = keyof SettingsMap
