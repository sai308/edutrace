import type { Meet } from '@Analytics/types/analytics'
import type { Mark } from '@Marks/types/marks'

export interface Module {
    id?: number | string
    groupId: string | number
    groupName: string
    [key: string]: any // Modules can have varying structures
}

export interface FinalAssessment {
    id?: number | string
    studentId: string
    assessmentType: string
    value: string | number
    createdAt?: string
    updatedAt?: string
    syncedAt?: string | null
    documentedAt?: string | null
    isAuto?: boolean
}

export interface AttendanceStats {
    percentage: number
    attendedMeets: number
    totalMeets: number
    attendedDuration: number
}

export interface ModuleStats {
    moduleGrades: Record<string, string | number | null>
    total: string | number | null
    totalRaw: number | null
    moduleDetailsData: Record<string, any>
    totalPartial: boolean
}

export interface SummaryStats {
    completionExact: number
    completedRegularTasks: number
    effectiveTotal: number
    attendance: AttendanceStats
    modules: ModuleStats
    averageMark: number
}

export interface WorkerSummaryResult {
    id: string
    stats: SummaryStats
}

export interface StudentSummaryData {
    id: string
    name: string
    email?: string
    aliases: string[]
    groups: string[]
    marks: Mark[]
    sessionCount: number
    totalSessions: number
    totalDuration: number
    averageAttendancePercent: number
    averageMark: number
    totalTasks: number
    completedTasks: number
    completionPercent: number
    completion: number
    completionExact: string
    completionDetails: string
    attendance: number
    attendanceExact: string
    attendanceDetails: string
    status: 'automatic' | 'allowed' | 'notAllowed'
    statusCause: string
    isAllowed: boolean
    moduleGrades: Record<string, string | number | null>
    moduleDetails: Record<string, any>
    total: string | number | null
    totalRaw: number | null
    totalDetails?: { missingLabel: string, missingModules: string[] } | null
    examGrade: string | number | null
    examGradeRaw: number | null
    examIsAuto: boolean
    completedAt: string | null
    meets: Meet[]
}

export interface SummaryLoadOptions {
    modules?: any[]
    completionThreshold?: number
    attendanceThreshold?: number
    attendanceEnabled?: boolean
    gradeFormat?: string
    requiredTasks?: number
    assessmentType?: string
    t: (key: string, params?: any, count?: number) => string
}

export interface SaveFinalAssessmentResult {
    id: string | number
    isNew: boolean
    updated: boolean
}
