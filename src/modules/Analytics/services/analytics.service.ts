import type { Group } from '@Groups/types/groups'
import type { Member } from '@Students/types/students'
import type {
    DetailedMatrixRow,
    DetailedSession,
    DetailedStats,
    EnrichedStat,
    GlobalStat,
    Meet,
    SingleReportStats,
} from '../types/analytics'
import { groupsRepository } from '@Groups/services/groups.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { settingsRepository } from '@/shared/services/settings.repository'
import { STATUS_COLOR_THRESHOLDS } from '../constants/analytics.constants'
import { meetsRepository } from './meets.repository'

// --- Private Utility Functions ---

function buildMemberLookups(allMembers: Member[]) {
    const nameToMember = new Map<string, Member>()
    const groupToMembers: Record<string, Set<Member>> = {}

    allMembers.forEach((s) => {
        nameToMember.set(s.name, s)
        if (s.aliases) {
            s.aliases.forEach(a => nameToMember.set(a, s))
        }
        if (s.groupName) {
            if (!groupToMembers[s.groupName]) {
                groupToMembers[s.groupName] = new Set()
            }
            groupToMembers[s.groupName]!.add(s)
        }
    })

    return { nameToMember, groupToMembers }
}

async function fetchCommonData() {
    const [ignoredUsers, groupsMap, allStudents] = await Promise.all([
        settingsRepository.getIgnoredUsers(),
        groupsRepository.getGroupMap(),
        studentsRepository.getAllMembers(),
    ])

    const teacherNames = allStudents.filter(m => m.role === 'teacher').map(m => m.name)

    const ignoredSet = new Set([...ignoredUsers, ...teacherNames])
    return { ignoredSet, groupsMap, allStudents }
}

// Exported so views can map percentage → Tailwind class without duplicating thresholds.
export function getStatusColor(percentage: number): string {
    if (percentage <= STATUS_COLOR_THRESHOLDS.VERY_LOW)
        return 'bg-red-500 text-white'
    if (percentage <= STATUS_COLOR_THRESHOLDS.LOW)
        return 'bg-red-400 text-white'
    if (percentage <= STATUS_COLOR_THRESHOLDS.MEDIUM)
        return 'bg-yellow-200 text-black'
    if (percentage <= STATUS_COLOR_THRESHOLDS.HIGH)
        return 'bg-yellow-400 text-black'
    return 'bg-green-500 text-white'
}

// --- Internal Aggregation Type ---

interface GroupedStat {
    meetId: string
    totalSessions: number
    totalDuration: number
    totalParticipantAppearances: number
    lastActive: string
    participants: Set<string>
    activeMemberIds: Set<string>
}

export class AnalyticsService {
    /**
     * Aggregates raw meet records into per-meetId GlobalStat summaries.
     * Filters out ignored users and teachers; respects group membership when
     * computing unique vs. active participant counts.
     */
    async getGlobalStats(meets: Meet[] | null = null): Promise<GlobalStat[]> {
        if (!meets) {
            meets = await meetsRepository.getAllMeets()
        }

        const { ignoredSet, groupsMap, allStudents } = await fetchCommonData()
        const { nameToMember, groupToMembers } = buildMemberLookups(allStudents)

        const grouped: Record<string, GroupedStat> = {}

        meets.forEach((meet: Meet) => {
            const meetId = meet.meetId
            if (!meetId)
                return // skip malformed records

            if (!grouped[meetId]) {
                grouped[meetId] = {
                    meetId,
                    totalSessions: 0,
                    totalDuration: 0,
                    totalParticipantAppearances: 0,
                    lastActive: meet.date,
                    participants: new Set<string>(),
                    activeMemberIds: new Set<string>(),
                }
            }

            const stats = grouped[meetId]!
            stats.totalSessions++
            if (meet.date > stats.lastActive) {
                stats.lastActive = meet.date
            }

            const group = groupsMap[meetId]
            const targetGroupMembers = group ? groupToMembers[group.name] : null
            let sessionMaxDuration = 0

            meet.participants.forEach((p) => {
                if (!p.name || ignoredSet.has(p.name))
                    return
                const duration
                    = typeof p.duration === 'number' && isFinite(p.duration) && p.duration >= 0 ? p.duration : 0

                const member = nameToMember.get(p.name)
                const shouldCountParticipant = targetGroupMembers ? !!(member && targetGroupMembers.has(member)) : true

                if (shouldCountParticipant) {
                    const uniqueId = member?.id || p.name
                    stats.participants.add(uniqueId)
                    stats.totalParticipantAppearances++
                    if (member)
                        stats.activeMemberIds.add(member.id)
                    if (duration > sessionMaxDuration)
                        sessionMaxDuration = duration
                }
            })

            stats.totalDuration += sessionMaxDuration
        })

        return Object.values(grouped).map((g) => {
            const group = groupsMap[g.meetId]
            let uniqueParticipantsCount = 0
            let activeParticipantsCount = 0

            if (group && groupToMembers[group.name]) {
                const groupMembers = groupToMembers[group.name]!
                let validMembersCount = 0
                groupMembers.forEach((m) => {
                    if (!ignoredSet.has(m.name))
                        validMembersCount++
                })
                uniqueParticipantsCount = validMembersCount
                activeParticipantsCount = g.activeMemberIds.size
            }
            else {
                uniqueParticipantsCount = g.participants.size
                activeParticipantsCount = g.participants.size
            }

            const totalPossibleAppearances = g.totalSessions * uniqueParticipantsCount
            const attendancePercentage
                = totalPossibleAppearances > 0
                    ? Math.round((g.totalParticipantAppearances / totalPossibleAppearances) * 100)
                    : 0

            const { participants, activeMemberIds, ...rest } = g

            return {
                ...rest,
                uniqueParticipantsCount,
                activeParticipantsCount,
                avgDuration: g.totalSessions > 0 ? g.totalDuration / g.totalSessions / 60 : 0,
                attendancePercentage,
                totalPossibleAppearances,
            } as GlobalStat
        })
    }

    /**
     * Attaches group metadata (displayName, teacherName, course, isGrouped) to
     * raw GlobalStat records. Call this after getGlobalStats() to get the full
     * EnrichedStat[] needed by the dashboard view.
     */
    enrichStats(stats: GlobalStat[], groupsMap: Record<string, Group>): EnrichedStat[] {
        return stats.map((stat) => {
            const group = groupsMap[stat.meetId]
            return {
                ...stat,
                displayName: group ? group.name : stat.meetId,
                teacherName: group ? group.teacher || null : null,
                course: group ? group.course || null : null,
                isGrouped: !!group,
            }
        })
    }

    /**
     * Builds the full per-participant × per-date attendance matrix for a single meetId.
     * Merges multiple uploads on the same date; adds absent group members as zero rows.
     */
    async getDetailedStats(meetId: string, teacherName: string | null = null): Promise<DetailedStats> {
        if (!meetId || typeof meetId !== 'string') {
            throw new Error('meetId must be a non-empty string')
        }

        const meetsPromise = meetsRepository.getMeetsByMeetId(meetId)
        const { ignoredSet, groupsMap, allStudents } = await fetchCommonData()
        const meets = await meetsPromise

        const localIgnoredSet = new Set(ignoredSet)
        if (teacherName && typeof teacherName === 'string') {
            localIgnoredSet.add(teacherName)
        }

        const group = groupsMap[meetId]
        const groupStudents = new Set<string>()
        if (group) {
            allStudents.forEach((s) => {
                if (s.groupName === group.name)
                    groupStudents.add(s.name)
            })
        }

        const sessionsByDate: Record<string, DetailedSession> = {}
        const allParticipants = new Set<string>()

        meets.forEach((meet) => {
            const date = meet.date
            if (!sessionsByDate[date]) {
                sessionsByDate[date] = {
                    date,
                    participants: {},
                    maxDuration: 0,
                    startTime: meet.startTime || null,
                    endTime: meet.endTime || null,
                }
            }
            else {
                if (
                    meet.startTime
                    && (!sessionsByDate[date]!.startTime || meet.startTime < sessionsByDate[date]!.startTime!)
                ) {
                    sessionsByDate[date]!.startTime = meet.startTime
                }
                if (meet.endTime && (!sessionsByDate[date]!.endTime || meet.endTime > sessionsByDate[date]!.endTime!)) {
                    sessionsByDate[date]!.endTime = meet.endTime
                }
            }

            meet.participants.forEach((p) => {
                if (!p.name || localIgnoredSet.has(p.name))
                    return
                allParticipants.add(p.name)

                if (!sessionsByDate[date]!.participants[p.name]) {
                    sessionsByDate[date]!.participants[p.name] = 0
                }
                sessionsByDate[date]!.participants[p.name]! += p.duration
            })
        })

        groupStudents.forEach((name) => {
            if (!localIgnoredSet.has(name))
                allParticipants.add(name)
        })

        Object.values(sessionsByDate).forEach((session) => {
            const durations = Object.values(session.participants)
            session.maxDuration = durations.length > 0 ? Math.max(...durations) : 0
        })

        const dates = Object.keys(sessionsByDate).sort()
        const participantsList = Array.from(allParticipants).sort()

        const matrix = participantsList.map((name) => {
            const row: DetailedMatrixRow = {
                name,
                totalDuration: 0,
                totalPossible: 0,
                totalPercentage: 0,
            }

            dates.forEach((date) => {
                const session = sessionsByDate[date]
                if (!session)
                    return

                const duration = session.participants[name] || 0
                const max = session.maxDuration || 1
                const percentage = Math.round((duration / max) * 100)

                row[date] = { duration, percentage, status: getStatusColor(percentage) }
                row.totalDuration += duration
                row.totalPossible += max
            })

            row.totalPercentage = row.totalPossible > 0 ? Math.round((row.totalDuration / row.totalPossible) * 100) : 0

            return row
        })

        return {
            dates,
            matrix,
            sessions: sessionsByDate,
            reportIds: meets.reduce(
                (acc, meet) => {
                    acc[meet.date] = meet.id
                    return acc
                },
                {} as Record<string, string>,
            ),
        }
    }

    /**
     * Returns a single-session snapshot for one uploaded meet file.
     * Used by the Reports detail page.
     */
    async getSingleReportStats(id: string): Promise<SingleReportStats> {
        if (!id || typeof id !== 'string') {
            throw new Error('id must be a non-empty string')
        }

        const meetPromise = meetsRepository.getMeetById(id)
        const { ignoredSet, allStudents } = await fetchCommonData()
        const meet = await meetPromise

        if (!meet)
            throw new Error('Meet not found')

        const { nameToMember: memberGroupMap } = buildMemberLookups(allStudents)

        const date = meet.date
        const participants = (meet.participants ?? []).filter(p => p.name && !ignoredSet.has(p.name))

        let maxDuration = 0
        participants.forEach((p) => {
            if (p.duration > maxDuration)
                maxDuration = p.duration
        })
        if (maxDuration === 0)
            maxDuration = 1

        const matrix = participants
            .map((p) => {
                const member = memberGroupMap.get(p.name)
                const percentage = Math.round((p.duration / maxDuration) * 100)
                return {
                    name: p.name,
                    groupName: member?.groupName || '',
                    joinTime: p.joinTime || null,
                    totalDuration: p.duration,
                    totalPossible: maxDuration,
                    totalPercentage: percentage,
                    [date]: {
                        duration: p.duration,
                        percentage,
                        status: getStatusColor(percentage),
                    },
                }
            })
            .sort((a, b) => b.totalDuration - a.totalDuration)

        const sessions: Record<string, DetailedSession> = {
            [date]: {
                date,
                participants: participants.reduce(
                    (acc, p) => ({ ...acc, [p.name]: p.duration }),
                    {} as Record<string, number>,
                ),
                maxDuration,
                startTime: meet.startTime || '',
                endTime: meet.endTime || '',
                attendees: participants.length,
            },
        }

        return {
            dates: [date],
            matrix,
            sessions,
            metadata: {
                filename: meet.filename || '',
                uploadedAt: meet.uploadedAt || '',
                startTime: meet.startTime || '',
                endTime: meet.endTime || '',
                meetId: meet.meetId,
                date: meet.date,
            },
        }
    }
}

export const analyticsService = new AnalyticsService()
