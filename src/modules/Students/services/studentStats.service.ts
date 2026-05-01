import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import type { Mark, Task } from '@Marks/types/marks'
import type { Member, StudentDashboardResult, StudentDashboardStats } from '../types/students'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { marksRepository } from '@Marks/services/marks.repository'

import { tasksRepository } from '@Tasks/services/tasks.repository'
import { settingsRepository } from '@/shared/services/settings.repository'
import { formatMarkToFiveScale } from '@/shared/utils/grades'
import { studentsRepository } from './students.repository'

/** Intermediate shape during aggregation — groups/meetIds are Sets for O(1) dedup, converted to sorted arrays at the end. */
type StudentDashboardRaw = Omit<StudentDashboardStats, 'groups' | 'meetIds'> & {
    groups: Set<string>
    meetIds: Set<string>
}

interface ProcessDataParams {
    meets: Meet[]
    members: Member[]
    tasks: Task[]
    marks: Mark[]
    groupsMap: Record<string, Group>
    teachers: Set<string>
    durationLimitSeconds: number
    targetGroupName: string | null
}

class StudentStatsService {
    /**
     * Loads and aggregates dashboard data.
     * @param {string|null} groupName - Optional group name to filter by.
     */
    async loadDashboardData(groupName: string | null = null): Promise<StudentDashboardResult> {
        // 1. Fetch Students
        let members: Member[]
        if (groupName) {
            members = await studentsRepository.getMembersByGroup(groupName)
        }
        else {
            members = await studentsRepository.getAllMembers()
        }

        const studentIds = members.map(m => m.id)

        // 2. Fetch Dependent Data in Parallel
        const promises: [
            Promise<Meet[]>,
            Promise<Record<string, Group>>,
            Promise<string[]>,
            Promise<Mark[]>,
            Promise<number>,
            Promise<Task[]>,
        ] = [
            meetsRepository.getAllMeets(),
            groupsRepository.getGroupMap(),
            settingsRepository.getTeachers(),
            marksRepository.getMarksByStudentIds(studentIds),
            settingsRepository.getDurationLimit(),
            tasksRepository.getAllTasks(),
        ]

        const [allMeets, groupMap, teacherList, marks, durationLimitMinutes, tasks] = await Promise.all(promises)

        const durationLimitSeconds = durationLimitMinutes > 0 ? durationLimitMinutes * 60 : Infinity
        const teachersSet = new Set(teacherList)

        // 3. Process Data
        return this.processData({
            meets: allMeets,
            members,
            tasks,
            marks,
            groupsMap: groupMap,
            teachers: teachersSet,
            durationLimitSeconds,
            targetGroupName: groupName,
        })
    }

    processData({
        meets,
        members,
        tasks,
        marks,
        groupsMap,
        teachers,
        durationLimitSeconds,
        targetGroupName,
    }: ProcessDataParams): StudentDashboardResult {
        const studentMap = new Map<string, StudentDashboardRaw>()

        // Initialize members
        members.forEach((m) => {
            if (m.role === 'teacher')
                return
            if (teachers.has(m.name))
                return

            studentMap.set(m.name, {
                id: m.id,
                name: m.name,
                email: m.email,
                groupName: m.groupName || '',
                role: m.role || 'student',
                aliases: m.aliases || [],
                iep: m.iep,
                totalDuration: 0,
                sessionCount: 0,
                groups: new Set(m.groupName ? [m.groupName] : []),
                meetIds: new Set(),
                attendedDuration: 0,
                possibleDuration: 0,
                totalSessions: 0,
                attendancePercentages: [],
                marks: [],
                totalTasks: 0,
                completedTasks: 0,
                averageMark: 0,
                completionPercent: 0,
                totalAttendancePercent: 0,
                averageAttendancePercent: 0,
            })
        })

        const meetDurations: Record<string, number> = {}
        const meetsByGroup: Record<string, Set<Meet>> = {}

        // 1. Calculate meet durations
        meets.forEach((meet) => {
            const groupInfo = groupsMap[meet.meetId]
            const meetGroupName = groupInfo?.name || meet.groupName // fallback

            if (targetGroupName && meetGroupName && meetGroupName !== targetGroupName) {
                return
            }

            const durations = (meet.participants || []).map(p => p.duration).sort((a, b) => a - b)
            let calculatedDuration = 0

            if (durations.length > 0) {
                const mid = Math.floor(durations.length / 2)
                const median
                    = durations.length % 2 !== 0
                        ? durations[mid]
                        : ((durations[mid - 1] ?? 0) + (durations[mid] ?? 0)) / 2

                const validDurations = durations.filter(d => d <= (median ?? 0) * 2)
                calculatedDuration = Math.max(...validDurations)
            }

            const duration = Math.min(calculatedDuration || 0, durationLimitSeconds)
            meetDurations[meet.id] = duration

            const finalGroupName = meetGroupName || meet.meetId
            if (!meetsByGroup[finalGroupName]) {
                meetsByGroup[finalGroupName] = new Set()
            }
            meetsByGroup[finalGroupName]!.add(meet)
        })

        // 2. Identify students/participation
        const nameToStudent = new Map<string, StudentDashboardRaw>()
        studentMap.forEach((s) => {
            nameToStudent.set(s.name, s)
            if (s.aliases)
                s.aliases.forEach((a: string) => nameToStudent.set(a, s))
        })

        meets.forEach((meet) => {
            const groupInfo = groupsMap[meet.meetId]
            const meetGroupName = groupInfo?.name || meet.groupName

            if (targetGroupName && meetGroupName && meetGroupName !== targetGroupName) {
                return
            }

            ;(meet.participants || []).forEach((p) => {
                const student = nameToStudent.get(p.name)
                if (student) {
                    student.totalDuration += p.duration
                    student.sessionCount += 1
                    if (!student.groupName && meetGroupName) {
                        student.groups.add(meetGroupName)
                    }
                    student.meetIds.add(meet.meetId)
                }
            })
        })

        // 3. Stats
        studentMap.forEach((student) => {
            const statsGroups = student.groups
            const studentNames = new Set([student.name, ...(student.aliases || [])])

            statsGroups.forEach((groupName) => {
                if (targetGroupName && groupName !== targetGroupName)
                    return

                const groupMeets = meetsByGroup[groupName] || new Set()
                groupMeets.forEach((meet) => {
                    const meetDuration = meetDurations[meet.id]
                    if (!meetDuration || meetDuration <= 0)
                        return

                    const participant = (meet.participants || []).find(p => studentNames.has(p.name))
                    const studentDuration = participant ? participant.duration : 0

                    student.possibleDuration += meetDuration
                    student.attendedDuration += studentDuration
                    student.totalSessions += 1
                    student.attendancePercentages.push(Math.min((studentDuration / meetDuration) * 100, 100))
                })
            })

            student.totalAttendancePercent
                = student.possibleDuration > 0 ? (student.attendedDuration / student.possibleDuration) * 100 : 0

            student.averageAttendancePercent
                = student.attendancePercentages.length > 0
                    ? student.attendancePercentages.reduce((a: number, b: number) => a + b, 0)
                    / student.attendancePercentages.length
                    : 0
        })

        // 4. Marks
        const taskMap = new Map<string, Task>()
        tasks.forEach(task => taskMap.set(task.id, task))

        studentMap.forEach((student) => {
            const studentMarks = marks.filter(mark => mark.studentId === student.id)
            student.marks = studentMarks

            if (studentMarks.length > 0) {
                let totalGrade = 0
                let validMarksCount = 0

                studentMarks.forEach((mark) => {
                    const task = taskMap.get(mark.taskId)
                    if (task && (task.maxPoints ?? 0) > 0 && mark.score !== undefined) {
                        totalGrade += formatMarkToFiveScale(mark.score, task.maxPoints!)
                        validMarksCount++
                    }
                })
                student.averageMark = validMarksCount > 0 ? totalGrade / validMarksCount : 0
            }

            // Count total tasks from the student's own marks (marks are already group-scoped)
            const groupTasksSet = new Set<string>(studentMarks.map(mark => mark.taskId))
            student.totalTasks = groupTasksSet.size

            const completedTaskIds = new Set(studentMarks.map(mark => mark.taskId))
            student.completedTasks = completedTaskIds.size

            student.completionPercent = student.totalTasks > 0 ? (student.completedTasks / student.totalTasks) * 100 : 0
        })

        // Convert Sets to sorted arrays for the final result
        const students = Array.from(studentMap.values()).map(s => ({
            ...s,
            groups: Array.from(s.groups).sort(),
            meetIds: Array.from(s.meetIds).sort(),
        })) as StudentDashboardStats[]

        return {
            students,
            groupsMap,
            teachers,
            meets,
            tasks,
        }
    }
}

export const studentStatsService = new StudentStatsService()
