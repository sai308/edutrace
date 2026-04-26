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
import { databaseService } from './DatabaseService'
import { settingsRepository } from './settings.repository'

// --- Clear Methods ---

export async function clearReports(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('meets')
}

export async function clearGroups(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('groups')
}

export async function clearTasks(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('tasks')
}

export async function clearMarks(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('marks')
}

export async function clearMembers(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('members')
}

export async function clearFinalAssessments(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('finalAssessments')
}

export async function clearModules(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('modules')
}

export async function clearUnits(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('units')
}

export async function clearSummary(): Promise<void> {
    await clearModules()
    await clearUnits()
    await clearFinalAssessments()
}

export async function clearSessions(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('sessions')
}

export async function clearPlans(): Promise<void> {
    const db = await databaseService.getDb()
    await db.clear('plans')
}

export async function clearAll(): Promise<void> {
    const db = await databaseService.getDb()
    await clearReports()
    await clearGroups()
    await clearTasks()
    await clearMarks()
    await clearSummary()
    await clearSessions()
    await clearPlans()
    await db.clear('members')
    ;(settingsRepository as any).clearSettings()
}

// --- Full Export/Import ---

export async function exportData(): Promise<any> {
    const [
        allMeets,
        allGroups,
        ignoredUsers,
        durationLimit,
        defaultTeacher,
        allTeachers,
        allTasks,
        allMarks,
        allMembers,
        allFinalAssessments,
        allModules,
        allUnits,
        examSettings,
        printSettings,
        allDocumentSessions,
        allPlans,
    ] = await Promise.all([
        (meetsRepository as any).getAllMeets(),
        (groupsRepository as any).getGroups(),
        (settingsRepository as any).getIgnoredUsers(),
        (settingsRepository as any).getDurationLimit(),
        (settingsRepository as any).getDefaultTeacher(),
        (settingsRepository as any).getTeachers(),
        (tasksRepository as any).getAllTasks(),
        (marksRepository as any).getAllMarks(),
        (studentsRepository as any).getAllMembers(),
        (finalAssessmentsRepository as any).getAllFinalAssessments(),
        (modulesRepository as any).getAllModules(),
        unitsRepository.getAllUnits(),
        (settingsRepository as any).getExamSettings(),
        (settingsRepository as any).getPrintSettings(),
        (sessionRepository as any).getAll(),
        (plansRepository as any).getAll(),
    ])

    return {
        meets: allMeets,
        groups: allGroups,
        tasks: allTasks,
        marks: allMarks,
        members: allMembers,
        finalAssessments: allFinalAssessments,
        modules: allModules,
        units: allUnits,
        documentSessions: allDocumentSessions,
        plans: allPlans,
        settings: {
            ignoredUsers,
            durationLimit,
            defaultTeacher,
            teachers: allTeachers,
            examSettings,
            printSettings,
        },
        version: 5,
        timestamp: new Date().toISOString(),
    }
}

export async function importData(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.meets || !jsonData.groups) {
        throw new Error('Invalid data format: Missing meets or groups data')
    }

    await clearAll()

    const db = await databaseService.getDb()
    const taskIdMapping = new Map<number | string, number | string>()

    // 1. Restore Meets
    if (jsonData.meets.length > 0) {
        const txMeets = db.transaction('meets', 'readwrite')
        const storeMeets = txMeets.objectStore('meets')
        await Promise.all(jsonData.meets.map((meet: any) => storeMeets.put(meet)))
        await txMeets.done
    }

    // 2. Restore Groups
    if (jsonData.groups.length > 0) {
        const txGroups = db.transaction('groups', 'readwrite')
        const storeGroups = txGroups.objectStore('groups')
        await Promise.all(
            jsonData.groups.map((group: any) => storeGroups.put(enrichGroupWithCourse(group))),
        )
        await txGroups.done
    }

    // 3. Restore Settings
    if (jsonData.settings) {
        const { durationLimit, defaultTeacher, ignoredUsers, teachers, examSettings } =
            jsonData.settings
        if (durationLimit !== undefined) {
            await (settingsRepository as any).saveDurationLimit(durationLimit)
        }
        if (Object.hasOwn(jsonData.settings, 'defaultTeacher')) {
            await (settingsRepository as any).saveDefaultTeacher(defaultTeacher || null)
        }
        if (Object.hasOwn(jsonData.settings, 'ignoredUsers')) {
            await (settingsRepository as any).saveIgnoredUsers(
                Array.isArray(ignoredUsers) ? ignoredUsers : [],
            )
        }
        if (Object.hasOwn(jsonData.settings, 'teachers')) {
            await (settingsRepository as any).saveTeachers(Array.isArray(teachers) ? teachers : [])
        }
        if (Object.hasOwn(jsonData.settings, 'examSettings')) {
            await (settingsRepository as any).saveExamSettings(examSettings || {})
        }
        if (Object.hasOwn(jsonData.settings, 'printSettings')) {
            await (settingsRepository as any).savePrintSettings(
                jsonData.settings.printSettings || {},
            )
        }
    }

    // 4. Restore Tasks
    if (jsonData.tasks && jsonData.tasks.length > 0) {
        const txTasks = db.transaction('tasks', 'readwrite')
        const storeTasks = txTasks.objectStore('tasks')

        for (const task of jsonData.tasks) {
            const oldId = task.id
            const index = storeTasks.index('name')
            const existing = await index.get(task.name)

            if (existing) {
                await storeTasks.put({ ...task, id: existing.id })
                taskIdMapping.set(oldId, existing.id)
            } else {
                const { id, ...taskWithoutId } = task
                const newId = await storeTasks.add(taskWithoutId)
                taskIdMapping.set(oldId, newId as number)
            }
        }
        await txTasks.done
    }

    // 5. Restore Members
    if (jsonData.members && jsonData.members.length > 0) {
        const txMembers = db.transaction('members', 'readwrite')
        const storeMembers = txMembers.objectStore('members')
        await Promise.all(jsonData.members.map((member: any) => storeMembers.put(member)))
        await txMembers.done
    }

    // 6. Restore Marks
    if (jsonData.marks && jsonData.marks.length > 0) {
        const txMarks = db.transaction('marks', 'readwrite')
        const storeMarks = txMarks.objectStore('marks')

        await Promise.all(
            jsonData.marks.map((mark: any) => {
                const newTaskId = taskIdMapping.get(mark.taskId) || mark.taskId
                return storeMarks.put({ ...mark, taskId: newTaskId as string })
            }),
        )

        await txMarks.done
    }

    // 7. Restore Final Assessments
    if (jsonData.finalAssessments && jsonData.finalAssessments.length > 0) {
        const txFinalAssessments = db.transaction('finalAssessments', 'readwrite')
        const storeFinalAssessments = txFinalAssessments.objectStore('finalAssessments')
        await Promise.all(
            jsonData.finalAssessments.map((item: any) => storeFinalAssessments.put(item)),
        )
        await txFinalAssessments.done
    }

    // 8. Restore Modules
    if (jsonData.modules && jsonData.modules.length > 0) {
        const txModules = db.transaction('modules', 'readwrite')
        const storeModules = txModules.objectStore('modules')
        const modulesPromises = (jsonData.modules || []).map((module: any) =>
            storeModules.put(module),
        )
        await Promise.all(modulesPromises)
        await txModules.done

        // Units
        const txUnits = db.transaction('units', 'readwrite')
        const storeUnits = txUnits.objectStore('units')
        const unitsPromises = (jsonData.units || []).map((unit: any) => storeUnits.put(unit))
        await Promise.all(unitsPromises)
        await txUnits.done
    }

    // 9. Restore Document Sessions
    if (jsonData.documentSessions && jsonData.documentSessions.length > 0) {
        const tx = db.transaction('sessions', 'readwrite')
        const store = tx.objectStore('sessions')
        await Promise.all(jsonData.documentSessions.map((session: any) => store.put(session)))
        await tx.done
    }

    // 10. Restore Plans
    if (jsonData.plans && jsonData.plans.length > 0) {
        const tx = db.transaction('plans', 'readwrite')
        const store = tx.objectStore('plans')
        await Promise.all(jsonData.plans.map((plan: any) => store.put(plan)))
        await tx.done
    }
}

// --- Helper ---
function enrichGroupWithCourse(group: any): any {
    if (!group.course && group.name) {
        const match = group.name.match(/\d/)
        if (match) {
            const course = Number.parseInt(match[0], 10)
            if (course >= 1 && course <= 4) {
                return { ...group, course }
            }
        }
    }
    return group
}

export async function exportReports(): Promise<any> {
    const allMeets = await (meetsRepository as any).getAllMeets()
    return { meets: allMeets, version: 1, type: 'reports', timestamp: new Date().toISOString() }
}

export async function exportGroups(): Promise<any> {
    const allGroups = await (groupsRepository as any).getGroups()
    return { groups: allGroups, version: 1, type: 'groups', timestamp: new Date().toISOString() }
}

export async function exportTasks(): Promise<any> {
    const allTasks = await (tasksRepository as any).getAllTasks()
    return {
        tasks: allTasks,
        version: 1,
        type: 'tasks',
        timestamp: new Date().toISOString(),
    }
}

export async function exportMarks(): Promise<any> {
    const [allMarks, allMembers] = await Promise.all([
        (marksRepository as any).getAllMarks(),
        (studentsRepository as any).getAllMembers(),
    ])
    return {
        marks: allMarks,
        members: allMembers,
        version: 3,
        type: 'marks',
        timestamp: new Date().toISOString(),
    }
}

export async function exportSummary(): Promise<any> {
    const [finalAssessments, modules, units, examSettings] = await Promise.all([
        (finalAssessmentsRepository as any).getAllFinalAssessments(),
        (modulesRepository as any).getAllModules(),
        unitsRepository.getAllUnits(),
        (settingsRepository as any).getExamSettings(),
    ])
    return {
        units,
        finalAssessments,
        modules,
        settings: { examSettings },
        version: 1,
        type: 'summary',
        timestamp: new Date().toISOString(),
    }
}

export async function importSummary(jsonData: any): Promise<void> {
    if (!jsonData) {
        throw new Error('Invalid summary data format')
    }

    const db = await databaseService.getDb()
    const tx = db.transaction(['finalAssessments', 'modules', 'units'], 'readwrite')

    const finalAssessmentsStore = tx.objectStore('finalAssessments')
    const modulesStore = tx.objectStore('modules')
    const unitsStore = tx.objectStore('units')

    await Promise.all([finalAssessmentsStore.clear(), modulesStore.clear(), unitsStore.clear()])

    const finalAssessmentsData = jsonData.finalAssessments || []
    const modulesData = jsonData.modules || []

    const operations: Promise<any>[] = []

    if (finalAssessmentsData.length > 0) {
        finalAssessmentsData.forEach((item: any) => {
            operations.push(finalAssessmentsStore.put(item))
        })
    }

    if (modulesData.length > 0) {
        modulesData.forEach((item: any) => {
            operations.push(modulesStore.put(item))
        })
    }

    await Promise.all(operations)
    await tx.done

    if (jsonData.settings && jsonData.settings.examSettings) {
        await (settingsRepository as any).saveExamSettings(jsonData.settings.examSettings)
    }
}

export async function importReports(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.meets) throw new Error('Invalid reports data')
    const db = await databaseService.getDb()
    const tx = db.transaction('meets', 'readwrite')
    const store = tx.objectStore('meets')
    await store.clear()
    await Promise.all(jsonData.meets.map((meet: any) => store.put(meet)))
    await tx.done

    // Sync members from newly imported meets
    await studentsRepository.syncAllMembersFromMeets()
}

export async function importGroups(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.groups) throw new Error('Invalid groups data')
    const db = await databaseService.getDb()
    const tx = db.transaction('groups', 'readwrite')
    const store = tx.objectStore('groups')
    await store.clear()
    await Promise.all(jsonData.groups.map((group: any) => store.put(enrichGroupWithCourse(group))))
    await tx.done
}

export async function importTasks(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.tasks) throw new Error('Invalid tasks data')
    await clearTasks()
    const db = await databaseService.getDb()

    const txTasks = db.transaction('tasks', 'readwrite')
    const storeTasks = txTasks.objectStore('tasks')

    for (const task of jsonData.tasks) {
        // Here we just insert/update
        await storeTasks.put(task)
    }
    await txTasks.done
}

export async function importMarks(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.marks) throw new Error('Invalid marks data')
    await clearMarks()

    // In version 3 marks, members might be updated, so it's safer to clear members
    if (jsonData.members) {
        await clearMembers()
    }

    const db = await databaseService.getDb()

    // Restore Members
    if (jsonData.members && jsonData.members.length > 0) {
        const txMembers = db.transaction('members', 'readwrite')
        const storeMembers = txMembers.objectStore('members')
        await Promise.all(jsonData.members.map((member: any) => storeMembers.put(member)))
        await txMembers.done
    }

    // Restore Tasks & Marks (For v2 backwards compatibility where tasks are bundled)
    if (jsonData.tasks && jsonData.tasks.length > 0) {
        const txTasks = db.transaction('tasks', 'readwrite')
        const storeTasks = txTasks.objectStore('tasks')
        const taskIdMapping = new Map<number | string, number | string>()

        for (const task of jsonData.tasks) {
            const oldId = task.id
            const { id, ...taskWithoutId } = task
            const newId = await storeTasks.add(taskWithoutId)
            taskIdMapping.set(oldId, newId as number)
        }
        await txTasks.done

        if (jsonData.marks && jsonData.marks.length > 0) {
            const txMarks = db.transaction('marks', 'readwrite')
            const storeMarks = txMarks.objectStore('marks')
            await Promise.all(
                jsonData.marks.map((mark: any) => {
                    const newTaskId = taskIdMapping.get(mark.taskId) || mark.taskId
                    return storeMarks.put({ ...mark, taskId: newTaskId as string })
                }),
            )
            await txMarks.done
        }
    } else {
        // Pure marks import without task mapping (version 3 or independent marks)
        if (jsonData.marks && jsonData.marks.length > 0) {
            const txMarks = db.transaction('marks', 'readwrite')
            const storeMarks = txMarks.objectStore('marks')
            await Promise.all(jsonData.marks.map((mark: any) => storeMarks.put(mark)))
            await txMarks.done
        }
    }
}

export async function exportMembers(): Promise<any> {
    const allMembers = await (studentsRepository as any).getAllMembers()
    return {
        members: allMembers,
        version: 1,
        type: 'members',
        timestamp: new Date().toISOString(),
    }
}

export async function importMembers(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.members) throw new Error('Invalid members data')

    const db = await databaseService.getDb()
    const tx = db.transaction('members', 'readwrite')
    const store = tx.objectStore('members')

    await store.clear()
    await Promise.all(jsonData.members.map((member: any) => store.put(member)))
    await tx.done
}

export async function exportDocumentSessions(): Promise<any> {
    const allSessions = await (sessionRepository as any).getAll()
    return {
        sessions: allSessions,
        version: 1,
        type: 'documentSessions',
        timestamp: new Date().toISOString(),
    }
}

export async function importDocumentSessions(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.sessions) throw new Error('Invalid sessions data')
    await clearSessions()
    const db = await databaseService.getDb()
    const tx = db.transaction('sessions', 'readwrite')
    const store = tx.objectStore('sessions')
    await Promise.all(jsonData.sessions.map((session: any) => store.put(session)))
    await tx.done
}

export async function exportPlans(): Promise<any> {
    const allPlans = await (plansRepository as any).getAll()
    return {
        plans: allPlans,
        version: 1,
        type: 'plans',
        timestamp: new Date().toISOString(),
    }
}

export async function importPlans(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.plans) throw new Error('Invalid plans data')
    await clearPlans()
    const db = await databaseService.getDb()
    const tx = db.transaction('plans', 'readwrite')
    const store = tx.objectStore('plans')
    await Promise.all(jsonData.plans.map((plan: any) => store.put(plan)))
    await tx.done
}
