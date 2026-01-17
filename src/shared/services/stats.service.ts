import { databaseService } from './DatabaseService';
import { workspaceRepository } from './workspace.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { tasksRepository } from '@Marks/services/tasks.repository';
import { marksRepository } from '@Marks/services/marks.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { finalAssessmentsRepository } from '@Summary/services/finalAssessments.repository';
import { modulesRepository } from '@Summary/services/modules.repository';

export interface EntityCounts {
    reports: number;
    groups: number;
    marks: number;
    tasks: number;
    members: number;
    finalAssessments: number;
    modules: number;
}

export interface EntitySizes {
    reports: number;
    groups: number;
    marks: number;
    tasks: number;
    members: number;
    summary: number;
}

/**
 * Estimates the size of data using JSON.stringify (in bytes).
 */
const getSize = (data: any): number => {
    try {
        // Use Blob to accurately count UTF-8 bytes, avoiding JS string length issues
        return new Blob([JSON.stringify(data)]).size;
    } catch (e) {
        console.error('Error calculating size for data:', e);
        return 0;
    }
};

export async function getEntityCounts(): Promise<EntityCounts> {
    const db = await databaseService.getDb();

    // Check which stores exist (for backward compatibility with older DB versions)
    const storeNames = Array.from(db.objectStoreNames);

    const counts = await Promise.all([
        db.count('meets'),
        db.count('groups'),
        db.count('tasks'),
        db.count('marks'),
        db.count('members'),
        storeNames.includes('finalAssessments') ? db.count('finalAssessments') : Promise.resolve(0),
        storeNames.includes('modules') ? db.count('modules') : Promise.resolve(0)
    ]);

    return {
        reports: counts[0],
        groups: counts[1],
        marks: counts[3],
        tasks: counts[2],
        members: counts[4],
        finalAssessments: counts[5],
        modules: counts[6]
    };
}

export async function getEntitySizes(): Promise<EntitySizes> {
    const [allMeets, allGroups, allTasks, allMarks, allMembers, allFinalAssessments, allModules] = await Promise.all([
        (meetsRepository as any).getAllMeets(),
        (groupsRepository as any).getGroups(),
        (tasksRepository as any).getAllTasks(),
        (marksRepository as any).getAllMarks(),
        (studentsRepository as any).getAllMembers(),
        (finalAssessmentsRepository as any).getAllFinalAssessments(),
        (modulesRepository as any).getAllModules()
    ]);

    return {
        reports: getSize(allMeets),
        groups: getSize(allGroups),
        marks: getSize(allMarks),
        tasks: getSize(allTasks),
        members: getSize(allMembers),
        summary: getSize(allFinalAssessments) + getSize(allModules)
    };
}

export async function getAllWorkspacesSizes(): Promise<any> {
    return workspaceRepository.getAllWorkspacesSizes();
}
