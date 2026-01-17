import { groupsRepository } from './groups.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { tasksRepository } from '@Marks/services/tasks.repository';
import { marksRepository } from '@Marks/services/marks.repository';
import { settingsRepository } from '@/shared/services/settings.repository';

import { v4 as uuidv4 } from 'uuid';

import { wrap } from 'comlink';
import type { Remote } from 'comlink';
import GroupsWorker from '@/workers/groups.worker?worker';
import type { Group, GroupFormData } from '../types/groups';
import type { Meet } from '@Analytics/types/analytics';
import type { Member } from '@Students/types/students';
import type { Task, Mark } from '@Marks/types/marks';

interface GroupsWorker {
    processGroupsData(
        groups: Group[],
        meets: Meet[],
        members: Member[],
        teacherList: string[],
        allTasks: Task[],
        allMarks: Mark[]
    ): Promise<{
        groups: (Group & {
            avgTaskCompletion: number;
            avgMark: number;
            modeMark: number;
            medianMark: number;
        })[];
        memberCounts: Record<string, number>;
        allMeetIds: string[];
        allTeachers: string[];
        teacherSet: Set<string>;
    }>;
}

export class GroupsService {
    private worker: Remote<GroupsWorker>;

    constructor() {
        this.worker = wrap(new (GroupsWorker as any)());
    }

    async loadGroupsData(): Promise<ReturnType<GroupsWorker['processGroupsData']>> {
        const [groups, meets, members, teacherList, allTasks, allMarks] = await Promise.all([
            groupsRepository.getGroups(),
            meetsRepository.getAllMeets(),
            studentsRepository.getAllMembers(),
            settingsRepository.getTeachers(),
            tasksRepository.getAllTasks(),
            marksRepository.getAllMarks()
        ]);

        // Pass data as plain objects to remove proxies
        const payload = [
            JSON.parse(JSON.stringify(groups)),
            JSON.parse(JSON.stringify(meets)),
            JSON.parse(JSON.stringify(members)),
            JSON.parse(JSON.stringify(teacherList)),
            JSON.parse(JSON.stringify(allTasks)),
            JSON.parse(JSON.stringify(allMarks))
        ] as const;

        return await this.worker.processGroupsData(...payload);
    }

    async saveGroup(formData: GroupFormData): Promise<Group> {
        if (!formData.name || !formData.meetId) {
            throw new Error('Validation failed: Name and Meet ID are required');
        }
        const group: Group = {
            ...formData,
            id: formData.id || uuidv4(),
            name: formData.name,
            meetId: formData.meetId
        };
        await groupsRepository.saveGroup(group);
        return group;
    }

    async deleteGroup(id: string | number): Promise<void> {
        await groupsRepository.deleteGroup(id);
    }
}

export const groupsService = new GroupsService();
