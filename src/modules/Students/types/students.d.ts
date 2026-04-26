export interface Member {
    id: string
    name: string
    email?: string
    groupName: string | null
    role: 'student' | 'teacher' | 'assistant'
    hidden?: boolean
    aliases?: string[]
    createdAt?: string
    iep?: string
    [key: string]: any
}

export interface StudentFormData {
    name: string
    email: string
    groupName: string | null
    role: 'student' | 'teacher' | 'assistant'
    iep: string
}

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
