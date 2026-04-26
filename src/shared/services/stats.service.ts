import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { marksRepository } from '@Marks/services/marks.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { finalAssessmentsRepository } from '@Summary/services/finalAssessments.repository'
import { modulesRepository } from '@Summary/services/modules.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { plansRepository } from '@/modules/Plans/services/plans.repository'
import { sessionRepository } from '@/modules/Sessions/services/sessions.repository'
import { unitsRepository } from '@/modules/Units/services/units.repository'
import { logger } from '@/shared/lib/logger'
import { databaseService } from './DatabaseService'
import { workspaceRepository } from './workspace.repository'

export interface EntityCounts {
    reports: number
    groups: number
    marks: number
    tasks: number
    members: number
    finalAssessments: number
    modules: number
    units: number
    documentSessions: number
    plans: number
}

export interface EntitySizes {
    reports: number
    groups: number
    marks: number
    tasks: number
    members: number
    summary: number
    documentSessions: number
    plans: number
}

/**
 * Estimates the size of data using JSON.stringify (in bytes).
 */
function getSize(data: unknown): number {
    try {
        // Use Blob to accurately count UTF-8 bytes, avoiding JS string length issues
        return new Blob([JSON.stringify(data)]).size
    }
    catch (e) {
        logger.error('Error calculating size for data:', e)
        return 0
    }
}

export async function getEntityCounts(): Promise<EntityCounts> {
    const db = await databaseService.getDb()

    // Check which stores exist (for backward compatibility with older DB versions)
    const storeNames = Array.from(db.objectStoreNames)

    const counts = await Promise.all([
        db.count('meets'),
        db.count('groups'),
        db.count('tasks'),
        db.count('marks'),
        db.count('members'),
        storeNames.includes('finalAssessments') ? db.count('finalAssessments') : Promise.resolve(0),
        storeNames.includes('modules') ? db.count('modules') : Promise.resolve(0),
        storeNames.includes('units') ? db.count('units') : Promise.resolve(0),
        storeNames.includes('sessions') ? db.count('sessions') : Promise.resolve(0),
        storeNames.includes('plans') ? db.count('plans') : Promise.resolve(0),
    ])

    return {
        reports: counts[0],
        groups: counts[1],
        marks: counts[3],
        tasks: counts[2],
        members: counts[4],
        finalAssessments: counts[5],
        modules: counts[6],
        units: counts[7],
        documentSessions: counts[8],
        plans: counts[9],
    }
}

export async function getEntitySizes(): Promise<EntitySizes> {
    const [
        allMeets,
        allGroups,
        allTasks,
        allMarks,
        allMembers,
        allFinalAssessments,
        allModules,
        allUnits,
        allSessions,
        allPlans,
    ] = await Promise.all([
        meetsRepository.getAllMeets(),
        groupsRepository.getGroups(),
        tasksRepository.getAllTasks(),
        marksRepository.getAllMarks(),
        studentsRepository.getAllMembers(),
        finalAssessmentsRepository.getAllFinalAssessments(),
        modulesRepository.getAllModules(),
        unitsRepository.getAllUnits(),
        sessionRepository.getAll(),
        plansRepository.getAll(),
    ])

    return {
        reports: getSize(allMeets),
        groups: getSize(allGroups),
        marks: getSize(allMarks),
        tasks: getSize(allTasks),
        members: getSize(allMembers),
        summary: getSize(allFinalAssessments) + getSize(allModules) + getSize(allUnits),
        documentSessions: getSize(allSessions),
        plans: getSize(allPlans),
    }
}

export async function getAllWorkspacesSizes(): Promise<Record<string, number>> {
    return workspaceRepository.getAllWorkspacesSizes()
}
