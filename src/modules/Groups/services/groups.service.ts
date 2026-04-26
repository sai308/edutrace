import type { Meet } from '@Analytics/types/analytics'
import type { Mark, Task } from '@Marks/types/marks'
import type { Member } from '@Students/types/students'
import type { Remote } from 'comlink'
import type { EnrichedGroup, Group, GroupFormData, GroupsData } from '../types/groups'
import { meetsRepository } from '@Analytics/services/meets.repository'

import { marksRepository } from '@Marks/services/marks.repository'

import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { wrap } from 'comlink'
import { v4 as uuidv4 } from 'uuid'
import { settingsRepository } from '@/shared/services/settings.repository'
import GroupsWorker from '@/workers/groups.worker?worker'
import { COURSE_MAX, COURSE_MIN } from '../constants/groups.constants'
import { groupsRepository } from './groups.repository'

/**
 * Infers a course number (1–4) from a group name by finding the first digit
 * that falls within the valid course range. Returns undefined when no match.
 */
export function suggestCourseFromName(name: string): number | undefined {
    const match = name.match(/\d/)
    if (!match) return undefined
    const course = Number.parseInt(match[0], 10)
    return course >= COURSE_MIN && course <= COURSE_MAX ? course : undefined
}

interface IGroupsWorker {
    processGroupsData: (
        groups: Group[],
        meets: Meet[],
        members: Member[],
        teacherList: string[],
        allTasks: Task[],
        allMarks: Mark[],
    ) => Promise<GroupsData & { teacherSet: Set<string> }>
}

export class GroupsService {
    private rawWorker: Worker
    private worker: Remote<IGroupsWorker>

    constructor() {
        this.rawWorker = new (GroupsWorker as any)()
        this.worker = wrap(this.rawWorker)
    }

    async loadGroupsData(): Promise<GroupsData> {
        const [groups, meets, members, teacherList, allTasks, allMarks] = await Promise.all([
            groupsRepository.getGroups(),
            meetsRepository.getAllMeets(),
            studentsRepository.getAllMembers(),
            settingsRepository.getTeachers(),
            tasksRepository.getAllTasks(),
            marksRepository.getAllMarks(),
        ])

        // Pass data as plain objects to avoid Proxy issues across the Comlink boundary
        const payload = [
            JSON.parse(JSON.stringify(groups)),
            JSON.parse(JSON.stringify(meets)),
            JSON.parse(JSON.stringify(members)),
            JSON.parse(JSON.stringify(teacherList)),
            JSON.parse(JSON.stringify(allTasks)),
            JSON.parse(JSON.stringify(allMarks)),
        ] as const

        const result = await this.worker.processGroupsData(...payload)
        return {
            groups: result.groups as EnrichedGroup[],
            memberCounts: result.memberCounts,
            allMeetIds: result.allMeetIds,
            // Use the settings teacher list (role-filtered, managed in Settings page)
            // rather than all meet participants from the worker.
            allTeachers: teacherList,
        }
    }

    async saveGroup(formData: GroupFormData): Promise<Group> {
        const name = formData.name?.trim()
        const meetId = formData.meetId?.trim()

        if (!name || !meetId) {
            throw new Error('Validation failed: Name and Meet ID are required')
        }

        const group: Group = {
            teacher: formData.teacher,
            course: formData.course,
            id: formData.id || uuidv4(),
            name,
            meetId,
        }
        await groupsRepository.saveGroup(group)
        return group
    }

    async deleteGroup(id: string | number): Promise<void> {
        await groupsRepository.deleteGroup(id)
    }
}

export const groupsService = new GroupsService()
