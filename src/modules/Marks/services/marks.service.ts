import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import type { FlatMark, Mark, MarksParsedData, MarksProcessingStats, SaveMarkResult } from '../types/marks'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import * as Comlink from 'comlink'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/shared/lib/logger'
import { classifyWorkerError, withTimeout } from '@/shared/lib/workerError'
import { settingsRepository } from '@/shared/services/settings.repository'
import { normalizeGroupName } from '@/shared/utils/groupNormalization'
import ParserWorker from '@/workers/parser.worker?worker'
import { marksRepository } from './marks.repository'
import { MarksReconciler } from './reconciliation/MarksReconciler'

const PARSER_TIMEOUT_MS = 30_000

interface ParserWorkerAPI {
    parseMarksCSV: (text: string, filename: string, groupName: string) => Promise<MarksParsedData>
    parseMeetReport: (text: string, filename: string) => Promise<Meet>
}

export class MarksService {
    private marksReconciler: MarksReconciler
    private worker: Worker
    private parser: Comlink.Remote<ParserWorkerAPI>

    constructor() {
        this.marksReconciler = new MarksReconciler()
        this.worker = new (ParserWorker as any)()
        this.parser = Comlink.wrap(this.worker)
    }

    async processFile(file: File, groupName: string): Promise<MarksProcessingStats> {
        try {
            // 1. Parse via Worker
            const text = await file.text()
            const parsedData: MarksParsedData = await withTimeout(
                this.parser.parseMarksCSV(text, file.name, groupName),
                PARSER_TIMEOUT_MS
            )

            // 1.5. Normalize Group Names
            const allGroups = await groupsRepository.getAll()
            parsedData.groupName = normalizeGroupName(parsedData.groupName, allGroups)
            for (const item of parsedData.studentsData) {
                if (item.student.groupName) {
                    item.student.groupName = normalizeGroupName(item.student.groupName, allGroups)
                }
            }

            // 2. Reconcile
            const { students, tasks, marks } = await this.marksReconciler.reconcile(parsedData, parsedData.groupName)

            // 3. Bulk Persist
            if (students.length > 0) {
                await studentsRepository.bulkPut(students)
            }

            if (tasks.length > 0) {
                await tasksRepository.bulkPut(tasks)
            }

            let stats = { added: 0, updated: 0, skipped: 0 }
            if (marks.length > 0) {
                stats = await marksRepository.bulkSaveSafe(marks)
            }

            return {
                newMarksCount: stats.added,
                skippedMarksCount: stats.skipped,
                updatedMarksCount: stats.updated,
            }
        } catch (e) {
            logger.error('Error processing marks:', e)
            throw classifyWorkerError(e)
        }
    }

    async saveManualMark(data: {
        groupName: string
        studentId: string
        taskId: string
        score: number
    }): Promise<SaveMarkResult> {
        const allTasks = await tasksRepository.getAllTasks()
        const task = allTasks.find((t) => t.id === data.taskId)
        return marksRepository.saveMark({
            taskId: data.taskId,
            studentId: data.studentId,
            groupName: data.groupName,
            score: data.score,
            value: data.score,
            maxPoints: task?.maxPoints,
            synced: false,
            createdAt: new Date().toISOString(),
        })
    }

    async toggleSynced(mark: Pick<Mark, 'id' | 'synced'>): Promise<boolean | undefined> {
        if (!mark || !mark.id) return
        const newSynced = !mark.synced
        await marksRepository.updateMarkSynced(mark.id, newSynced)
        return newSynced
    }

    async deleteMark(id: string | number): Promise<void> {
        await marksRepository.deleteMarks([id])
    }

    async loadGroups(): Promise<Group[]> {
        const groups = await groupsRepository.getAll()
        return groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    }

    async createGroup(groupData: Partial<Group>): Promise<Group> {
        const dataToSave = { ...groupData } as Group
        if (!dataToSave.id) {
            dataToSave.id = uuidv4()
        }

        await groupsRepository.add(dataToSave)
        return dataToSave
    }

    async suggestMeetIdsForFile(file: File): Promise<string[]> {
        try {
            const text = await file.text()
            const parsed: MarksParsedData = await withTimeout(
                this.parser.parseMarksCSV(text, file.name, ''),
                PARSER_TIMEOUT_MS
            )
            const studentNames = new Set(parsed.studentsData.map((s) => s.student.name.toLowerCase().trim()))
            if (studentNames.size === 0) return []

            const meetIdScores = new Map<string, number>()

            // Path 1: match student names against meet participants
            const allMeets = await meetsRepository.getAllMeets()
            for (const meet of allMeets) {
                if (!meet.meetId || !Array.isArray(meet.participants)) continue
                const matchCount = meet.participants.filter((p) => studentNames.has(p.name.toLowerCase().trim())).length
                if (matchCount > 0) {
                    meetIdScores.set(meet.meetId, (meetIdScores.get(meet.meetId) ?? 0) + matchCount)
                }
            }

            // Path 2: match student names against existing members → their group's meetId
            const [allMembers, allGroups] = await Promise.all([
                studentsRepository.getAllMembers({ includeHidden: true }),
                groupsRepository.getAll(),
            ])
            const groupMeetIdMap = new Map(allGroups.filter((g) => g.meetId).map((g) => [g.name, g.meetId]))
            for (const member of allMembers) {
                if (!member.groupName || !studentNames.has(member.name.toLowerCase().trim())) continue
                const meetId = groupMeetIdMap.get(member.groupName)
                if (meetId) {
                    meetIdScores.set(meetId, (meetIdScores.get(meetId) ?? 0) + 1)
                }
            }

            return [...meetIdScores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
        } catch {
            return []
        }
    }

    async loadSuggestions(): Promise<{ allMeetIds: string[]; allTeachers: string[] }> {
        const [meets, teachersList] = await Promise.all([
            meetsRepository.getAllMeets(),
            settingsRepository.getTeachers(),
        ])

        const allMeetIds = meets.map((m) => m.meetId).filter(Boolean)
        const uniqueMeets = [...new Set(allMeetIds)]
        const uniqueTeachers = [...new Set(teachersList)]

        return { allMeetIds: uniqueMeets, allTeachers: uniqueTeachers }
    }

    async loadMarksData(groupName: string | null = null): Promise<FlatMark[]> {
        if (groupName) {
            return marksRepository.getMarksByGroupWithRelations(groupName)
        } else {
            return marksRepository.getAllMarksWithRelations()
        }
    }

    async deleteMarks(ids: (string | number)[]): Promise<void> {
        await marksRepository.deleteMarks(ids)
    }
}

export const marksService = new MarksService()
