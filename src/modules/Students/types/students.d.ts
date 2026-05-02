import type { Member, MemberFormData } from '@Members/types/members'

export type { Member, MemberFormData }

// backward-compat alias — Students module still uses this name
export type { MemberFormData as StudentFormData }

export interface StudentDashboardStats extends Member {
    totalDuration: number
    sessionCount: number
    groups: string[]
    meetIds: string[]
    attendedDuration: number
    possibleDuration: number
    totalSessions: number
    attendancePercentages: number[]
    marks: any[]
    totalTasks: number
    completedTasks: number
    averageMark: number
    completionPercent: number
    totalAttendancePercent: number
    averageAttendancePercent: number
}

export interface StudentDashboardResult {
    students: StudentDashboardStats[]
    groupsMap: Record<string, any>
    teachers: Set<string>
    meets: any[]
    tasks: any[]
}
