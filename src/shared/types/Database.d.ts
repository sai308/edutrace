import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import type { Mark } from '@Marks/types/marks'
import type { Plan } from '@Plans/types/plans'
import type { Member } from '@Students/types/students'
import type { FinalAssessment, Module } from '@Summary/types/summary'
import type { Task } from '@Tasks/types/tasks'
import type { Unit } from '@Units/types/units'
// Helper for the idb library
import type { DBSchema } from 'idb'
import type { SettingsMap } from './Settings'
import type { SessionReport } from '@/modules/Sessions/models/session.model'

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
