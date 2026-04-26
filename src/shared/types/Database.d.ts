// Helper for the idb library
import type { DBSchema } from 'idb'
import type { FinalAssessment, Group, Mark, Meet, Member, Module, Task } from './models'
import type { SettingsMap } from './Settings'
import type { Plan } from '@/modules/Plans/models/plan.model'
import type { SessionReport } from '@/modules/Sessions/models/session.model'
import type { Unit } from '@/modules/Units/types/units'

export interface IDBCustomSchema extends DBSchema {
    meets: {
        key: string
        value: Meet
        indexes: { meetId: string, date: string }
    }
    settings: {
        key: keyof SettingsMap
        value: SettingsMap[keyof SettingsMap]
    }
    groups: {
        key: string | number
        value: Group
        indexes: { meetId: string, name: string }
    }
    tasks: {
        key: number
        value: Task
        indexes: { name: string, normalizedName: string }
    }
    units: {
        key: number
        value: Unit
        indexes: { name: string, normalizedName: string }
    }
    marks: {
        key: number
        value: Mark
        indexes: {
            taskId: string
            studentId: string
            task_student: [string, string]
            createdAt: string
            groupName: string
        }
    }
    members: {
        key: string
        value: Member
        indexes: { name: string, groupName: string, role: string }
    }
    modules: {
        key: number
        value: Module
        indexes: { groupId: string, groupName: string }
    }
    finalAssessments: {
        key: number
        value: FinalAssessment
        indexes: { studentId: string, assessmentType: string, student_type: [string, string] }
    }
    sessions: {
        key: string
        value: SessionReport
        indexes: { groupId: string, sessionType: string, group_type: [string, string] }
    }
    plans: {
        key: string
        value: Plan
        indexes: { studentId: string, sessionType: string }
    }
    // Legacy
    students: { key: any, value: any }
}
