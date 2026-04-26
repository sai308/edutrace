import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import type { Mark, Task } from '@Marks/types/marks'
import type { Member } from '@Students/types/students'
import type {
    FinalAssessment,
    Module,
    StudentSummaryData,
    SummaryLoadOptions,
    SummaryStats,
    WorkerSummaryResult,
} from '../types/summary'
import type { Unit } from '@/modules/Units/types/units'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { marksRepository } from '@Marks/services/marks.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import * as Comlink from 'comlink'
import { unitsRepository } from '@/modules/Units/services/units.repository'
import { logger } from '@/shared/lib/logger'
import { classifyWorkerError, withTimeout } from '@/shared/lib/workerError'
import { settingsRepository } from '@/shared/services/settings.repository'
import { createMarkFormatter } from '@/shared/utils/grades'
import SummaryWorker from '@/workers/summary.worker?worker'
import { finalAssessmentsRepository } from './finalAssessments.repository'

interface SummaryWorkerAPI {
    calculateSummary: (
        members: Member[],
        marks: Mark[],
        meets: Meet[],
        tasks: Task[],
        modules: Module[],
        options: {
            durationLimitSeconds: number
            gradeFormat: string
            requiredTasks: number
        },
    ) => Promise<WorkerSummaryResult[]>
}

const SUMMARY_TIMEOUT_MS = 60_000

export class SummaryService {
    private workerWrapper: Worker
    private worker: Comlink.Remote<SummaryWorkerAPI>

    constructor() {
        this.workerWrapper = new (SummaryWorker as unknown as new () => Worker)()
        this.worker = Comlink.wrap(this.workerWrapper)
    }

    async loadExamData(
        group: Group,
        options: SummaryLoadOptions,
    ): Promise<{ students: StudentSummaryData[], context: any }> {
        if (!group)
            return { students: [], context: {} }

        const {
            modules = [],
            completionThreshold = 70,
            attendanceThreshold = 60,
            attendanceEnabled = true,
            gradeFormat = '5-scale',
            requiredTasks = 0,
            assessmentType = 'examination',
            t, // Localization function
        } = options

        logger.log('[SummaryService] Fetching data for group:', group.name)
        const [members, allTasks, allMarks, allMeets, allGroupsMap, durationLimitMinutes, allAssessments]
            = await Promise.all([
                studentsRepository.getMembersByGroup(group.name),
                tasksRepository.getAllTasks(),
                marksRepository.getMarksByGroup(group.name),
                group.meetId ? meetsRepository.getMeetsByMeetId(group.meetId) : Promise.resolve([]),
                groupsRepository.getGroupMap(),
                settingsRepository.getDurationLimit(),
                finalAssessmentsRepository.getAllFinalAssessments(),
            ])
        logger.log('[SummaryService] Fetched data counts:', {
            members: members.length,
            tasks: allTasks.length,
            marks: allMarks.length,
            meets: allMeets.length,
            modules: modules.length,
        })

        // Auto-repair missing or incorrect group names on members based on their marks
        if (allMarks.length > 0) {
            const studentIdsWithMarks = [...new Set(allMarks.map(m => m.studentId))]
            let fixedCount = 0

            for (const sid of studentIdsWithMarks) {
                const member = await studentsRepository.getById(sid.toString())
                if (member && member.groupName !== group.name) {
                    member.groupName = group.name
                    await studentsRepository.put(member)
                    if (!members.some(x => x.id === member.id)) {
                        members.push(member)
                    }
                    fixedCount++
                }
                else if (member && member.groupName === group.name && !members.some(x => x.id === member.id)) {
                    members.push(member) // Was missing from index somehow
                }
            }
            if (fixedCount > 0) {
                logger.log(`[SummaryService] Auto-repaired ${fixedCount} members with mismatched group names.`)
            }
        }

        const durationLimitSeconds = durationLimitMinutes > 0 ? durationLimitMinutes * 60 : Infinity
        const activeMembers = members.filter(m => m.role !== 'teacher' && !m.hidden)

        let workerResults
        try {
            workerResults = await withTimeout(
                this.worker.calculateSummary(
                    JSON.parse(JSON.stringify(activeMembers)),
                    JSON.parse(JSON.stringify(allMarks)),
                    JSON.parse(JSON.stringify(allMeets)),
                    JSON.parse(JSON.stringify(allTasks)),
                    JSON.parse(JSON.stringify(modules)),
                    {
                        durationLimitSeconds,
                        gradeFormat,
                        requiredTasks,
                    },
                ),
                SUMMARY_TIMEOUT_MS,
            )
        }
        catch (e) {
            logger.error('Summary worker error:', e)
            throw classifyWorkerError(e)
        }

        const assessmentMap = new Map<string, FinalAssessment>()
        for (const assess of allAssessments) {
            assessmentMap.set(`${assess.studentId}_${assess.assessmentType}`, assess)
        }

        const statsMap = new Map<string, SummaryStats>()
        workerResults.forEach(r => statsMap.set(r.id, r.stats))

        const marksByStudent = new Map<string, Mark[]>()
        for (const mark of allMarks) {
            const sid = mark.studentId
            if (!marksByStudent.has(sid))
                marksByStudent.set(sid, [])
            marksByStudent.get(sid)!.push(mark)
        }

        const studentsData: StudentSummaryData[] = activeMembers
            .map((member) => {
                const stats = statsMap.get(member.id)
                if (!stats)
                    return null

                const {
                    completionExact,
                    completedRegularTasks,
                    effectiveTotal,
                    attendance,
                    modules: moduleStats,
                    averageMark,
                } = stats

                const { percentage: attendancePercent, attendedMeets, totalMeets, attendedDuration } = attendance
                const { moduleGrades, total, totalRaw, moduleDetailsData } = moduleStats

                // Formatter to convert stored 100-point grade to display scale
                const displayFormatter = createMarkFormatter(gradeFormat)

                // --- Status determination ---
                // Check if all modules are fully complete (no partial, no empty)
                const allModulesComplete
                    = modules.length > 0 && Object.values(moduleDetailsData).every((d: any) => d.type === 'complete')

                let status: 'automatic' | 'allowed' | 'notAllowed' = 'notAllowed'

                if (completionExact >= 100 && allModulesComplete) {
                    status = 'automatic'
                }
                else if (completionExact >= completionThreshold) {
                    status = 'allowed'
                }

                // --- Status tooltip (localized) ---
                let statusCause = ''
                if (status === 'notAllowed') {
                    const reasons: string[] = []
                    if (completionExact < completionThreshold) {
                        reasons.push(
                            t('summary.data.reasons.completion', {
                                percentage: Math.round(completionExact),
                                threshold: completionThreshold,
                            }),
                        )
                    }
                    if (attendanceEnabled && attendancePercent < attendanceThreshold) {
                        reasons.push(
                            t('summary.data.reasons.attendance', {
                                percentage: Math.round(attendancePercent),
                                threshold: attendanceThreshold,
                            }),
                        )
                    }
                    // List incomplete modules
                    const incompleteModules = Object.entries(moduleDetailsData)
                        .filter(([, d]: [string, any]) => d.type !== 'complete')
                        .map(([name]) => name)
                    if (incompleteModules.length > 0) {
                        reasons.push(`${t('summary.data.reasons.modulesIncomplete')}: ${incompleteModules.join(', ')}`)
                    }
                    statusCause
                        = reasons.length === 0
                            ? t('summary.data.cause.criteriaNotMet')
                            : t('summary.data.cause.requirementsNotMet', {
                                    reasons: reasons.join('; '),
                                })
                }
                else if (status === 'allowed') {
                    const incompleteModules = Object.entries(moduleDetailsData)
                        .filter(([, d]: [string, any]) => d.type !== 'complete')
                        .map(([name]) => name)
                    if (incompleteModules.length > 0) {
                        statusCause = `${t('summary.data.cause.admitted', {
                            attendanceThreshold,
                            completionThreshold,
                        })}. ${t('summary.data.status.allowedMissing', { modules: incompleteModules.join(', ') })}`
                    }
                    else {
                        statusCause = t('summary.data.cause.admitted', {
                            attendanceThreshold,
                            completionThreshold,
                        })
                    }
                }
                else if (status === 'automatic') {
                    statusCause = t('summary.data.cause.excellentPerformance', {
                        completion: Math.round(completionExact),
                    })
                }

                // --- Module detail tooltips (localized & structured) ---
                const moduleDetails: Record<string, any> = {}
                Object.entries(moduleDetailsData).forEach(([modName, det]) => {
                    const detail = det as any

                    if (detail.type === 'empty') {
                        moduleDetails[modName] = {
                            type: 'empty',
                            text: t('summary.data.moduleTooltip.noGrades'),
                        }
                        return
                    }

                    const metrics: any[] = []

                    // Formula / avg info
                    if (detail.formula) {
                        metrics.push({
                            type: 'tasks',
                            avg: detail.formula.avg || '-',
                            completed: detail.completedTasks,
                            total: detail.totalTasks,
                            coeff: detail.formula.tasksCoeff || 1,
                        })

                        if (detail.formula.test !== undefined) {
                            metrics.push({
                                type: 'test',
                                val: detail.formula.test,
                                coeff: detail.formula.testCoeff,
                            })
                        }
                    }

                    let missingTest = ''
                    if (detail.missingTest) {
                        missingTest = t('summary.data.moduleTooltip.missingTest')
                    }

                    let missingLabel = ''
                    const missingTasks: string[] = []
                    if (detail.missingTasks && detail.missingTasks.length > 0) {
                        // Extracting "Missing N tasks" without the task names list
                        missingLabel = t(
                            'summary.data.moduleTooltip.missingTasks',
                            {
                                count: detail.missingTasks.length,
                                names: '',
                            },
                            detail.missingTasks.length,
                        )
                            .replace(/:[ \t]*$/, '')
                            .replace(':', '')
                            .trim()
                        missingTasks.push(...detail.missingTasks)
                    }

                    moduleDetails[modName] = {
                        type: detail.type,
                        metrics,
                        missingTest,
                        missingLabel,
                        missingTasks,
                    }
                })

                const assessment = assessmentMap.get(`${member.id}_${assessmentType}`)
                // examGrade is stored as 100-point — convert to display scale
                const examGradeRaw = assessment ? Number(assessment.value) : null
                const examGrade = examGradeRaw !== null && !isNaN(examGradeRaw) ? displayFormatter(examGradeRaw) : null
                const completedAt = assessment && assessment.documentedAt ? assessment.documentedAt : null

                return {
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    aliases: member.aliases || [],
                    groups: [member.groupName],
                    marks: marksByStudent.get(member.id) || [],

                    sessionCount: attendedMeets,
                    totalSessions: totalMeets,
                    totalDuration: attendedDuration,
                    averageAttendancePercent: attendancePercent,
                    averageMark,
                    totalTasks: effectiveTotal,
                    completedTasks: completedRegularTasks,
                    completionPercent: completionExact,

                    completion: Math.round(completionExact),
                    completionExact: completionExact.toFixed(2),
                    completionDetails: t('summary.data.details.completion', {
                        completed: completedRegularTasks,
                        total: effectiveTotal,
                    }),
                    attendance: Math.round(attendancePercent),
                    attendanceExact: attendancePercent.toFixed(2),
                    attendanceDetails: t('summary.data.details.attendance', {
                        attended: attendedMeets,
                        total: totalMeets,
                    }),
                    status,
                    statusCause,
                    isAllowed: status === 'automatic' || status === 'allowed',
                    moduleGrades,
                    moduleDetails,
                    total,
                    totalRaw: totalRaw ?? null,
                    examGrade,
                    examGradeRaw,
                    examIsAuto: assessment?.isAuto !== false, // Default to true for backwards compatibility if undefined
                    completedAt,
                    meets: allMeets,
                } as StudentSummaryData
            })
            .filter((s): s is StudentSummaryData => s !== null)

        return {
            students: studentsData,
            context: {
                meets: allMeets,
                tasks: allTasks,
                groupsMap: allGroupsMap,
            },
        }
    }

    async getAllFinalAssessments(): Promise<FinalAssessment[]> {
        return finalAssessmentsRepository.getAllFinalAssessments()
    }

    async getMembersByGroup(groupName: string): Promise<Member[]> {
        return studentsRepository.getMembersByGroup(groupName)
    }

    async updateAssessmentSyncStatus(id: string | number, syncedAt: string | null): Promise<void> {
        return finalAssessmentsRepository.updateSyncStatus(id, syncedAt)
    }

    async updateAssessmentDocumentStatus(id: string | number, documentedAt: string | null): Promise<void> {
        return finalAssessmentsRepository.updateDocumentStatus(id, documentedAt)
    }

    async getGroups(): Promise<Group[]> {
        return groupsRepository.getAll()
    }

    async getExamSettings(): Promise<any> {
        return settingsRepository.getExamSettings()
    }

    async saveExamSettings(settings: any): Promise<void> {
        return settingsRepository.saveExamSettings(settings)
    }

    async getTasksByGroup(_groupName: string): Promise<Task[]> {
        return tasksRepository.getAllTasks()
    }

    async saveFinalAssessment(
        assessment: Partial<FinalAssessment> & { studentId: string, assessmentType: string },
    ): Promise<any> {
        return finalAssessmentsRepository.saveFinalAssessment(assessment)
    }

    async getFinalAssessmentByStudent(studentId: string, type: string): Promise<FinalAssessment | undefined> {
        return finalAssessmentsRepository.getFinalAssessmentByStudent(studentId, type)
    }

    async deleteFinalAssessment(id: string | number): Promise<void> {
        return finalAssessmentsRepository.deleteFinalAssessment(id)
    }

    async getModulesByGroup(groupName: string): Promise<Module[]> {
        const units = await unitsRepository.getAllUnits()
        return units.map((u: Unit) => ({
            id: u.id,
            name: u.name,
            groupId: groupName,
            groupName,
            tasks: u.taskIds.map((tId: string) => ({ id: tId })),
            test: u.testTaskId ? { id: u.testTaskId } : undefined,
            tasksCoefficient: u.taskCoef || 1,
            testCoefficient: u.testCoef || 1,
            minTasksRequired: 1,
        })) as Module[]
    }

    async saveModule(_module: Module): Promise<string | number> {
        throw new Error('Not implemented. Define Units instead.')
    }

    async deleteModule(_id: string | number): Promise<void> {
        throw new Error('Not implemented. Delete Units instead.')
    }
}

export const summaryService = new SummaryService()
