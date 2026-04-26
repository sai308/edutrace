import type { Group } from '@Groups/types/groups'
import type {
    GradeType,
    SessionEntry,
    SessionReport,
    SessionType,
} from '@Sessions/models/session.model'
import type { StudentSummaryData } from '@Summary/types/summary'
import { GradeTypeEnum, SessionStatusEnum, SessionTypeEnum } from '@Sessions/models/session.model'
import { sessionRepository } from '@Sessions/services/sessions.repository'
import { summaryService } from '@Summary/services/summary.service'

export class SessionsService {
    /**
     * Resolves the raw 100-point grade, grade type, and updatedAt timestamp
     * from a StudentSummaryData record.
     *
     * Priority: examGradeRaw → totalRaw → null
     * isAuto defaults to true unless explicitly set to false.
     */
    private resolveGradeFromStudent(
        student: Pick<
            StudentSummaryData,
            'examGradeRaw' | 'totalRaw' | 'examIsAuto' | 'completedAt'
        >,
    ): {
        grade: number | null
        gradeType: GradeType
        updatedAt: string
    } {
        let grade: number | null = null
        if (student.examGradeRaw != null) {
            grade = student.examGradeRaw
        } else if (student.totalRaw != null) {
            grade = Number(student.totalRaw)
        }

        const isAutoGrade = student.examIsAuto !== false
        const updatedAt = student.completedAt ?? new Date().toISOString()

        return {
            grade,
            gradeType: isAutoGrade ? GradeTypeEnum.AUTO : GradeTypeEnum.MANUAL,
            updatedAt,
        }
    }

    /**
     * Initializes the Main Session for a given group.
     * Starts by pulling all active students and their computed "Summary" grades.
     */
    async initializeMainSession(group: Group): Promise<SessionReport> {
        if (!group.id) throw new Error('Group ID is required')

        const existing = await sessionRepository.getGroupSession(
            group.id as string,
            SessionTypeEnum.MAIN,
        )
        if (existing) return existing

        const examData = await summaryService.loadExamData(group, {
            assessmentType: 'examination',
            t: (key: string) => key,
        })

        const entries: SessionEntry[] = examData.students.map((student) => {
            const { grade, gradeType, updatedAt } = this.resolveGradeFromStudent(student)
            return {
                studentId: student.id,
                studentSnapshot: {
                    id: student.id,
                    fullName: student.name,
                    groupName: student.groups?.[0],
                },
                grade,
                gradeType,
                updatedAt,
            }
        })

        return sessionRepository.create({
            sessionType: SessionTypeEnum.MAIN,
            status: SessionStatusEnum.OPEN,
            groupId: group.id as string,
            openedAt: new Date().toISOString(),
            closedAt: null,
            entries,
        })
    }

    /**
     * Syncs an OPEN Main session with the latest grades from the Summary module.
     * Updates missing or AUTO grades and adds any newly joined students.
     */
    async syncMainSession(group: Group, sessionId: string): Promise<SessionReport> {
        const session = await sessionRepository.getById(sessionId)
        if (!session) throw new Error('Session not found')
        if (session.status === SessionStatusEnum.CLOSED) return session
        if (session.sessionType !== SessionTypeEnum.MAIN) return session

        const examData = await summaryService.loadExamData(group, {
            assessmentType: 'examination',
            t: (key: string) => key,
        })

        let updated = false

        // 1. Sync existing entries (only if grade is missing or was AUTO)
        for (const entry of session.entries) {
            if (entry.grade === null || entry.gradeType === GradeTypeEnum.AUTO) {
                const studentData = examData.students.find((s) => s.id === entry.studentId)
                if (studentData) {
                    const {
                        grade: newVal,
                        gradeType,
                        updatedAt,
                    } = this.resolveGradeFromStudent(studentData)
                    if (
                        (newVal != null && entry.grade !== newVal) ||
                        entry.gradeType !== gradeType
                    ) {
                        entry.grade = newVal
                        entry.gradeType = gradeType
                        entry.updatedAt = updatedAt
                        updated = true
                    }
                }
            }
        }

        // 2. Add any newly joined students
        for (const student of examData.students) {
            if (!session.entries.some((e) => e.studentId === student.id)) {
                const { grade, gradeType, updatedAt } = this.resolveGradeFromStudent(student)
                session.entries.push({
                    studentId: student.id,
                    studentSnapshot: {
                        id: student.id,
                        fullName: student.name,
                        groupName: student.groups?.[0],
                    },
                    grade,
                    gradeType,
                    updatedAt,
                })
                updated = true
            }
        }

        if (updated) {
            await sessionRepository.put(session)
        }

        return session
    }

    /**
     * Initializes a Retake Session based on the previous session's results.
     * Only students who did not pass (grade < 60) or have no grade are carried over.
     */
    async initializeRetakeSession(
        group: Group,
        previousSessionId: string,
        type: SessionType,
    ): Promise<SessionReport> {
        if (!group.id) throw new Error('Group ID is required')

        const existing = await sessionRepository.getGroupSession(group.id as string, type)
        if (existing) return existing

        const prevSession = await sessionRepository.getById(previousSessionId)
        if (!prevSession) throw new Error('Previous session not found')
        if (prevSession.status !== SessionStatusEnum.CLOSED)
            throw new Error('Previous session is not closed')

        const PASS_THRESHOLD = 60

        const retakeEntries: SessionEntry[] = prevSession.entries
            .filter((entry) => entry.grade === null || entry.grade < PASS_THRESHOLD)
            .map((entry) => ({
                studentId: entry.studentId,
                studentSnapshot: entry.studentSnapshot,
                grade: null,
                gradeType: GradeTypeEnum.MANUAL,
                updatedAt: new Date().toISOString(),
            }))

        return sessionRepository.create({
            sessionType: type,
            status: SessionStatusEnum.OPEN,
            groupId: group.id as string,
            openedAt: new Date().toISOString(),
            closedAt: null,
            entries: retakeEntries,
        })
    }

    /**
     * Syncs an OPEN Retake session with the latest grades from the Summary module.
     * Updates missing or AUTO grades for students already listed in the retake session.
     * New students are NOT added — retake sessions are intentionally limited to the
     * students who failed or missed the previous session.
     */
    async syncRetakeSession(group: Group, sessionId: string): Promise<SessionReport> {
        const session = await sessionRepository.getById(sessionId)
        if (!session) throw new Error('Session not found')
        if (session.status === SessionStatusEnum.CLOSED) return session
        if (session.sessionType === SessionTypeEnum.MAIN) return session

        const examData = await summaryService.loadExamData(group, {
            assessmentType: 'examination',
            t: (key: string) => key,
        })

        let updated = false

        for (const entry of session.entries) {
            if (entry.grade === null || entry.gradeType === GradeTypeEnum.AUTO) {
                const studentData = examData.students.find((s) => s.id === entry.studentId)
                if (studentData) {
                    const {
                        grade: newVal,
                        gradeType,
                        updatedAt,
                    } = this.resolveGradeFromStudent(studentData)
                    if (
                        (newVal != null && entry.grade !== newVal) ||
                        entry.gradeType !== gradeType
                    ) {
                        entry.grade = newVal
                        entry.gradeType = gradeType
                        entry.updatedAt = updatedAt
                        updated = true
                    }
                }
            }
        }

        if (updated) {
            await sessionRepository.put(session)
        }

        return session
    }

    /**
     * Closes a session, freezing its state.
     */
    async closeSession(sessionId: string): Promise<SessionReport> {
        const session = await sessionRepository.getById(sessionId)
        if (!session) throw new Error('Session not found')

        session.status = SessionStatusEnum.CLOSED
        session.closedAt = new Date().toISOString()

        await sessionRepository.put(session)
        return session
    }

    /**
     * Updates a single student's grade in an open session. Always sets gradeType to MANUAL.
     */
    async updateGrade(sessionId: string, studentId: string, grade: number): Promise<SessionReport> {
        const session = await sessionRepository.getById(sessionId)
        if (!session) throw new Error('Session not found')

        if (session.status === SessionStatusEnum.CLOSED) {
            throw new Error('Cannot edit a closed session')
        }

        const entryIndex = session.entries.findIndex((e) => e.studentId === studentId)
        if (entryIndex === -1) throw new Error('Student not found in session')

        session.entries[entryIndex]!.grade = grade
        session.entries[entryIndex]!.gradeType = GradeTypeEnum.MANUAL
        session.entries[entryIndex]!.updatedAt = new Date().toISOString()

        await sessionRepository.put(session)
        return session
    }
}

export const sessionsService = new SessionsService()
