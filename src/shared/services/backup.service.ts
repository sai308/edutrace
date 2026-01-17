import { databaseService } from './DatabaseService';
import { settingsRepository } from './settings.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { tasksRepository } from '@Marks/services/tasks.repository';
import { marksRepository } from '@Marks/services/marks.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { finalAssessmentsRepository } from '@Summary/services/finalAssessments.repository';
import { modulesRepository } from '@Summary/services/modules.repository';

// --- Clear Methods ---

export async function clearReports(): Promise<void> {
    const db = await databaseService.getDb();
    await db.clear('meets');
}

export async function clearGroups(): Promise<void> {
    const db = await databaseService.getDb();
    await db.clear('groups');
}

export async function clearMarks(): Promise<void> {
    const db = await databaseService.getDb();
    await db.clear('tasks');
    await db.clear('marks');
}

export async function clearMembers(): Promise<void> {
    const db = await databaseService.getDb();
    await db.clear('members');
}

export async function clearFinalAssessments(): Promise<void> {
    const db = await databaseService.getDb();
    await db.clear('finalAssessments');
}

export async function clearModules(): Promise<void> {
    const db = await databaseService.getDb();
    await db.clear('modules');
}

export async function clearAll(): Promise<void> {
    await clearReports();
    await clearGroups();
    await clearMarks();
    await clearMembers();
    await clearFinalAssessments();
    await clearModules();
    (settingsRepository as any).clearSettings();
}

// --- Full Export/Import ---

export async function exportData(): Promise<any> {
    const [allMeets, allGroups, ignoredUsers, durationLimit, defaultTeacher, allTeachers, allTasks, allMarks, allMembers, allFinalAssessments, allModules, examSettings] = await Promise.all([
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
        (settingsRepository as any).getExamSettings()
    ]);

    return {
        meets: allMeets,
        groups: allGroups,
        tasks: allTasks,
        marks: allMarks,
        members: allMembers,
        finalAssessments: allFinalAssessments,
        modules: allModules,
        settings: {
            ignoredUsers,
            durationLimit,
            defaultTeacher,
            teachers: allTeachers,
            examSettings
        },
        version: 4,
        timestamp: new Date().toISOString()
    };
}

export async function importData(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.meets || !jsonData.groups) {
        throw new Error('Invalid data format: Missing meets or groups data');
    }

    await clearAll();

    const db = await databaseService.getDb();
    const taskIdMapping = new Map<number | string, number | string>();

    // 1. Restore Meets
    if (jsonData.meets.length > 0) {
        const txMeets = db.transaction('meets', 'readwrite');
        const storeMeets = txMeets.objectStore('meets');
        await Promise.all(jsonData.meets.map((meet: any) => storeMeets.put(meet)));
        await txMeets.done;
    }

    // 2. Restore Groups
    if (jsonData.groups.length > 0) {
        const txGroups = db.transaction('groups', 'readwrite');
        const storeGroups = txGroups.objectStore('groups');
        await Promise.all(jsonData.groups.map((group: any) => storeGroups.put(enrichGroupWithCourse(group))));
        await txGroups.done;
    }

    // 3. Restore Settings
    if (jsonData.settings) {
        const { durationLimit, defaultTeacher, ignoredUsers, teachers, examSettings } = jsonData.settings;
        if (durationLimit !== undefined) {
            await (settingsRepository as any).saveDurationLimit(durationLimit);
        }
        if (Object.prototype.hasOwnProperty.call(jsonData.settings, 'defaultTeacher')) {
            await (settingsRepository as any).saveDefaultTeacher(defaultTeacher || null);
        }
        if (Object.prototype.hasOwnProperty.call(jsonData.settings, 'ignoredUsers')) {
            await (settingsRepository as any).saveIgnoredUsers(Array.isArray(ignoredUsers) ? ignoredUsers : []);
        }
        if (Object.prototype.hasOwnProperty.call(jsonData.settings, 'teachers')) {
            await (settingsRepository as any).saveTeachers(Array.isArray(teachers) ? teachers : []);
        }
        if (Object.prototype.hasOwnProperty.call(jsonData.settings, 'examSettings')) {
            await (settingsRepository as any).saveExamSettings(examSettings || {});
        }
    }

    // 4. Restore Tasks
    if (jsonData.tasks && jsonData.tasks.length > 0) {
        const txTasks = db.transaction('tasks', 'readwrite');
        const storeTasks = txTasks.objectStore('tasks');

        for (const task of jsonData.tasks) {
            const oldId = task.id;
            const index = storeTasks.index('name_date_group');
            const existing = await index.get([task.name, task.date, task.groupName]);

            if (existing) {
                await storeTasks.put({ ...task, id: existing.id });
                taskIdMapping.set(oldId, existing.id);
            } else {
                const { id, ...taskWithoutId } = task;
                const newId = await storeTasks.add(taskWithoutId);
                taskIdMapping.set(oldId, newId as number);
            }
        }
        await txTasks.done;
    }

    // 5. Restore Members
    if (jsonData.members && jsonData.members.length > 0) {
        const txMembers = db.transaction('members', 'readwrite');
        const storeMembers = txMembers.objectStore('members');
        await Promise.all(jsonData.members.map((member: any) => storeMembers.put(member)));
        await txMembers.done;
    }

    // 6. Restore Marks
    if (jsonData.marks && jsonData.marks.length > 0) {
        const txMarks = db.transaction('marks', 'readwrite');
        const storeMarks = txMarks.objectStore('marks');

        await Promise.all(jsonData.marks.map((mark: any) => {
            const newTaskId = taskIdMapping.get(mark.taskId) || mark.taskId;
            return storeMarks.put({ ...mark, taskId: newTaskId as string });
        }));

        await txMarks.done;
    }

    // 7. Restore Final Assessments
    if (jsonData.finalAssessments && jsonData.finalAssessments.length > 0) {
        const txFinalAssessments = db.transaction('finalAssessments', 'readwrite');
        const storeFinalAssessments = txFinalAssessments.objectStore('finalAssessments');
        await Promise.all(jsonData.finalAssessments.map((item: any) => storeFinalAssessments.put(item)));
        await txFinalAssessments.done;
    }

    // 8. Restore Modules
    if (jsonData.modules && jsonData.modules.length > 0) {
        const txModules = db.transaction('modules', 'readwrite');
        const storeModules = txModules.objectStore('modules');
        await Promise.all(jsonData.modules.map((item: any) => storeModules.put(item)));
        await txModules.done;
    }
}

// --- Helper ---
function enrichGroupWithCourse(group: any): any {
    if (!group.course && group.name) {
        const match = group.name.match(/\d/);
        if (match) {
            const course = parseInt(match[0], 10);
            if (course >= 1 && course <= 4) {
                return { ...group, course };
            }
        }
    }
    return group;
}

export async function exportReports(): Promise<any> {
    const allMeets = await (meetsRepository as any).getAllMeets();
    return { meets: allMeets, version: 1, type: 'reports', timestamp: new Date().toISOString() };
}

export async function exportGroups(): Promise<any> {
    const allGroups = await (groupsRepository as any).getGroups();
    return { groups: allGroups, version: 1, type: 'groups', timestamp: new Date().toISOString() };
}

export async function exportMarks(): Promise<any> {
    const [allTasks, allMarks, allMembers] = await Promise.all([
        (tasksRepository as any).getAllTasks(),
        (marksRepository as any).getAllMarks(),
        (studentsRepository as any).getAllMembers()
    ]);
    return {
        tasks: allTasks,
        marks: allMarks,
        members: allMembers,
        version: 2,
        type: 'marks',
        timestamp: new Date().toISOString()
    };
}

export async function exportSummary(): Promise<any> {
    const [finalAssessments, modules, examSettings] = await Promise.all([
        (finalAssessmentsRepository as any).getAllFinalAssessments(),
        (modulesRepository as any).getAllModules(),
        (settingsRepository as any).getExamSettings()
    ]);
    return {
        finalAssessments,
        modules,
        settings: { examSettings },
        version: 1,
        type: 'summary',
        timestamp: new Date().toISOString()
    };
}

export async function importSummary(jsonData: any): Promise<void> {
    if (!jsonData) {
        throw new Error('Invalid summary data format');
    }

    const db = await databaseService.getDb();
    const tx = db.transaction(['finalAssessments', 'modules'], 'readwrite');

    const finalAssessmentsStore = tx.objectStore('finalAssessments');
    const modulesStore = tx.objectStore('modules');

    await Promise.all([
        finalAssessmentsStore.clear(),
        modulesStore.clear()
    ]);

    const finalAssessmentsData = jsonData.finalAssessments || [];
    const modulesData = jsonData.modules || [];

    const operations: Promise<any>[] = [];

    if (finalAssessmentsData.length > 0) {
        finalAssessmentsData.forEach((item: any) => {
            operations.push(finalAssessmentsStore.put(item));
        });
    }

    if (modulesData.length > 0) {
        modulesData.forEach((item: any) => {
            operations.push(modulesStore.put(item));
        });
    }

    await Promise.all(operations);
    await tx.done;

    if (jsonData.settings && jsonData.settings.examSettings) {
        await (settingsRepository as any).saveExamSettings(jsonData.settings.examSettings);
    }
}

export async function importReports(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.meets) throw new Error('Invalid reports data');
    const db = await databaseService.getDb();
    const tx = db.transaction('meets', 'readwrite');
    const store = tx.objectStore('meets');
    await store.clear();
    await Promise.all(jsonData.meets.map((meet: any) => store.put(meet)));
    await tx.done;
}

export async function importGroups(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.groups) throw new Error('Invalid groups data');
    const db = await databaseService.getDb();
    const tx = db.transaction('groups', 'readwrite');
    const store = tx.objectStore('groups');
    await store.clear();
    await Promise.all(jsonData.groups.map((group: any) => store.put(enrichGroupWithCourse(group))));
    await tx.done;
}

export async function importMarks(jsonData: any): Promise<void> {
    if (!jsonData || !jsonData.marks) throw new Error('Invalid marks data');
    await clearMarks();
    await clearMembers();

    const db = await databaseService.getDb();

    // Restore Members
    if (jsonData.members && jsonData.members.length > 0) {
        const txMembers = db.transaction('members', 'readwrite');
        const storeMembers = txMembers.objectStore('members');
        await Promise.all(jsonData.members.map((member: any) => storeMembers.put(member)));
        await txMembers.done;
    }

    // Restore Tasks & Marks
    if (jsonData.tasks && jsonData.tasks.length > 0) {
        const txTasks = db.transaction('tasks', 'readwrite');
        const storeTasks = txTasks.objectStore('tasks');
        const taskIdMapping = new Map<number | string, number | string>();

        for (const task of jsonData.tasks) {
            const oldId = task.id;
            const { id, ...taskWithoutId } = task;
            const newId = await storeTasks.add(taskWithoutId);
            taskIdMapping.set(oldId, newId as number);
        }
        await txTasks.done;

        if (jsonData.marks && jsonData.marks.length > 0) {
            const txMarks = db.transaction('marks', 'readwrite');
            const storeMarks = txMarks.objectStore('marks');
            await Promise.all(jsonData.marks.map((mark: any) => {
                const newTaskId = taskIdMapping.get(mark.taskId) || mark.taskId;
                return storeMarks.put({ ...mark, taskId: newTaskId as string });
            }));
            await txMarks.done;
        }
    }
}
