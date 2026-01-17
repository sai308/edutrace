import * as Comlink from 'comlink';
import SummaryWorker from '@/workers/summary.worker?worker';
import { modulesRepository } from './modules.repository';
import { finalAssessmentsRepository } from './finalAssessments.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { tasksRepository } from '@Marks/services/tasks.repository';
import { marksRepository } from '@Marks/services/marks.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { settingsRepository } from '@/shared/services/settings.repository';
import type { Member } from '@Students/types/students';
import type { Mark, Task } from '@Marks/types/marks';
import type { Group } from '@Groups/types/groups';
import type { Meet } from '@Analytics/types/analytics';
import type {
    SummaryStats,
    WorkerSummaryResult,
    StudentSummaryData,
    SummaryLoadOptions,
    Module,
    FinalAssessment
} from '../types/summary';

interface SummaryWorker {
    calculateSummary(
        members: Member[],
        marks: Mark[],
        meets: Meet[],
        tasks: Task[],
        modules: Module[],
        options: {
            durationLimitSeconds: number;
            gradeFormat: string;
            requiredTasks: number;
        }
    ): Promise<WorkerSummaryResult[]>;
}

export class SummaryService {
    private workerWrapper: Worker;
    private worker: Comlink.Remote<SummaryWorker>;

    constructor() {
        this.workerWrapper = new (SummaryWorker as any)();
        this.worker = Comlink.wrap(this.workerWrapper);
    }

    async loadExamData(group: Group, options: SummaryLoadOptions): Promise<{ students: StudentSummaryData[], context: any }> {
        if (!group) return { students: [], context: {} };

        const {
            modules = [],
            completionThreshold = 70,
            attendanceThreshold = 60,
            attendanceEnabled = true,
            gradeFormat = '5-scale',
            requiredTasks = 0,
            assessmentType = 'examination',
            t // Localization function
        } = options;

        const [
            members,
            allTasks,
            allMarks,
            allMeets,
            allGroupsMap,
            durationLimitMinutes,
            allAssessments
        ] = await Promise.all([
            studentsRepository.getMembersByGroup(group.name),
            tasksRepository.getTasksByGroup(group.name),
            marksRepository.getMarksByGroup(group.name),
            meetsRepository.getMeetsByMeetId(group.meetId),
            groupsRepository.getGroupMap(),
            settingsRepository.getDurationLimit(),
            finalAssessmentsRepository.getAllFinalAssessments()
        ]);

        const durationLimitSeconds = durationLimitMinutes > 0 ? durationLimitMinutes * 60 : Infinity;
        const activeMembers = members.filter(m => m.role !== 'teacher' && !m.hidden);

        const workerResults = await this.worker.calculateSummary(
            JSON.parse(JSON.stringify(activeMembers)),
            JSON.parse(JSON.stringify(allMarks)),
            JSON.parse(JSON.stringify(allMeets)),
            JSON.parse(JSON.stringify(allTasks)),
            JSON.parse(JSON.stringify(modules)),
            {
                durationLimitSeconds,
                gradeFormat,
                requiredTasks
            }
        );

        const assessmentMap = new Map<string, FinalAssessment>();
        for (const assess of allAssessments) {
            assessmentMap.set(`${assess.studentId}_${assess.assessmentType}`, assess);
        }

        const statsMap = new Map<string, SummaryStats>();
        workerResults.forEach(r => statsMap.set(r.id, r.stats));

        const marksByStudent = new Map<string, Mark[]>();
        for (const mark of allMarks) {
            const sid = mark.studentId;
            if (!marksByStudent.has(sid)) marksByStudent.set(sid, []);
            marksByStudent.get(sid)!.push(mark);
        }

        const studentsData: StudentSummaryData[] = activeMembers.map(member => {
            const stats = statsMap.get(member.id);
            if (!stats) return null;

            const { completionExact, completedRegularTasks, effectiveTotal, attendance, modules: moduleStats, averageMark } = stats;
            const { percentage: attendancePercent, attendedMeets, totalMeets, attendedDuration } = attendance;
            const { moduleGrades, total, moduleDetailsData, isAutomaticCandidate } = moduleStats;

            const isAttendanceMet = !attendanceEnabled || attendancePercent >= attendanceThreshold;
            let status: 'automatic' | 'allowed' | 'notAllowed' = 'notAllowed';

            if (isAutomaticCandidate && total !== null) {
                status = 'automatic';
            } else if (completionExact >= completionThreshold && isAttendanceMet) {
                status = 'allowed';
            }

            let statusCause = '';
            if (status === 'notAllowed') {
                const reasons: string[] = [];
                if (attendanceEnabled && attendancePercent < attendanceThreshold) {
                    reasons.push(t('summary.data.reasons.attendance', {
                        percentage: Math.round(attendancePercent),
                        threshold: attendanceThreshold
                    }));
                }
                if (completionExact < completionThreshold) {
                    reasons.push(t('summary.data.reasons.completion', {
                        percentage: Math.round(completionExact),
                        threshold: completionThreshold
                    }));
                }
                if (completionExact >= completionThreshold && isAttendanceMet && total === null) {
                    reasons.push(t('summary.data.reasons.modulesIncomplete'));
                }
                statusCause = reasons.length === 0
                    ? t('summary.data.cause.criteriaNotMet')
                    : t('summary.data.cause.requirementsNotMet', { reasons: reasons.join(', ') });
            } else if (status === 'automatic') {
                statusCause = t('summary.data.cause.excellentPerformance', {
                    completion: Math.round(completionExact)
                });
            } else if (status === 'allowed') {
                statusCause = t('summary.data.cause.admitted', {
                    attendanceThreshold,
                    completionThreshold
                });
            }

            const moduleDetails: Record<string, string> = {};
            Object.entries(moduleDetailsData).forEach(([modName, det]) => {
                const detail = det as any;
                if (detail.type === 'incompleteMissingTest') {
                    moduleDetails[modName] = t('summary.data.details.modules.incompleteMissingTest');
                } else if (detail.type === 'incompleteMissingTasks') {
                    moduleDetails[modName] = t('summary.data.details.modules.incompleteMissingTasks', { count: detail.count }, detail.count);
                } else if (detail.type === 'details') {
                    moduleDetails[modName] = t('summary.data.details.modules.details', {
                        avg: detail.data.avg,
                        tasksCoeff: detail.data.tasksCoeff,
                        test: detail.data.test,
                        testCoeff: detail.data.testCoeff
                    });
                }
            });

            const assessment = assessmentMap.get(`${member.id}_${assessmentType}`);

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
                averageMark: averageMark,
                totalTasks: effectiveTotal,
                completedTasks: completedRegularTasks,
                completionPercent: completionExact,

                completion: Math.round(completionExact),
                completionExact: completionExact.toFixed(2),
                completionDetails: t('summary.data.details.completion', {
                    completed: completedRegularTasks,
                    total: effectiveTotal
                }),
                attendance: Math.round(attendancePercent),
                attendanceExact: attendancePercent.toFixed(2),
                attendanceDetails: t('summary.data.details.attendance', {
                    attended: attendedMeets,
                    total: totalMeets
                }),
                status,
                statusCause,
                isAllowed: status === 'allowed' || status === 'automatic',
                moduleGrades,
                moduleDetails,
                total,
                examGrade: assessment ? assessment.value : null,
                completedAt: assessment ? assessment.createdAt || null : null,
                meets: allMeets
            } as StudentSummaryData;
        }).filter((s): s is StudentSummaryData => s !== null);

        return {
            students: studentsData,
            context: {
                meets: allMeets,
                tasks: allTasks,
                groupsMap: allGroupsMap
            }
        };
    }

    async getAllFinalAssessments(): Promise<FinalAssessment[]> {
        return finalAssessmentsRepository.getAllFinalAssessments();
    }

    async getMembersByGroup(groupName: string): Promise<Member[]> {
        return studentsRepository.getMembersByGroup(groupName);
    }

    async updateAssessmentSyncStatus(id: string | number, syncedAt: string | null): Promise<void> {
        return finalAssessmentsRepository.updateSyncStatus(id, syncedAt);
    }

    async updateAssessmentDocumentStatus(id: string | number, documentedAt: string | null): Promise<void> {
        return finalAssessmentsRepository.updateDocumentStatus(id, documentedAt);
    }

    async getGroups(): Promise<Group[]> {
        return groupsRepository.getAll();
    }

    async getExamSettings(): Promise<any> {
        return settingsRepository.getExamSettings();
    }

    async saveExamSettings(settings: any): Promise<void> {
        return settingsRepository.saveExamSettings(settings);
    }

    async getTasksByGroup(groupName: string): Promise<Task[]> {
        return tasksRepository.getTasksByGroup(groupName);
    }

    async saveFinalAssessment(assessment: Partial<FinalAssessment> & { studentId: string, assessmentType: string }): Promise<any> {
        return finalAssessmentsRepository.saveFinalAssessment(assessment);
    }

    async getFinalAssessmentByStudent(studentId: string, type: string): Promise<FinalAssessment | undefined> {
        return finalAssessmentsRepository.getFinalAssessmentByStudent(studentId, type);
    }

    async deleteFinalAssessment(id: string | number): Promise<void> {
        return finalAssessmentsRepository.deleteFinalAssessment(id);
    }

    async getModulesByGroup(groupName: string): Promise<Module[]> {
        return modulesRepository.getModulesByGroup(groupName);
    }

    async saveModule(module: Module): Promise<string | number> {
        return modulesRepository.saveModule(module);
    }

    async deleteModule(id: string | number): Promise<void> {
        return modulesRepository.deleteModule(id);
    }
}

export const summaryService = new SummaryService();
