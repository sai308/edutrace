import type { Meet } from '@Analytics/types/analytics'

export interface TimelineParticipant {
    name: string
    joinTime: string | undefined
    duration: number
    /** Offset from session start as a percentage of total session duration. */
    offsetPercent: number
    /** Participant duration as a percentage of total session duration. */
    durationPercent: number
    /** Attendance as rounded integer percentage (0–100). */
    percentage: number
}

export interface TimelineData {
    participants: TimelineParticipant[]
    totalDuration: number
    startTime: Date | null
    endTime: Date | null
}

/**
 * Derives timeline layout data from a meet record.
 * Session bounds come from explicit startTime/endTime when available,
 * otherwise estimated from the earliest join time and latest (join + duration).
 */
export function calculateTimelineData(meet: Meet): TimelineData {
    let sessionStart: Date
    let sessionEnd: Date

    if (meet.startTime && meet.endTime) {
        sessionStart = new Date(meet.startTime)
        sessionEnd = new Date(meet.endTime)
    }
    else {
        const joinTimes = meet.participants
            .map(p => (p.joinTime ? new Date(p.joinTime).getTime() : null))
            .filter((t): t is number => t !== null)

        if (joinTimes.length === 0) {
            return { participants: [], totalDuration: 0, startTime: null, endTime: null }
        }

        const minTime = Math.min(...joinTimes)
        const endTimes = meet.participants.map((p) => {
            const start = p.joinTime ? new Date(p.joinTime).getTime() : minTime
            return start + p.duration * 1000
        })
        const maxTime = Math.max(...endTimes)

        sessionStart = new Date(minTime)
        sessionEnd = new Date(maxTime)
    }

    const totalDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000

    const participants: TimelineParticipant[] = meet.participants.map((p) => {
        const joinTime = p.joinTime ? new Date(p.joinTime) : sessionStart
        const offsetSeconds = (joinTime.getTime() - sessionStart.getTime()) / 1000
        const offsetPercent = totalDuration > 0 ? (offsetSeconds / totalDuration) * 100 : 0
        const durationPercent = totalDuration > 0 ? (p.duration / totalDuration) * 100 : 0
        const percentage = totalDuration > 0 ? Math.round((p.duration / totalDuration) * 100) : 0

        return {
            name: p.name,
            joinTime: p.joinTime,
            duration: p.duration,
            offsetPercent: Math.max(0, offsetPercent),
            durationPercent: Math.min(100 - offsetPercent, durationPercent),
            percentage,
        }
    })

    return {
        participants,
        totalDuration,
        startTime: sessionStart,
        endTime: sessionEnd,
    }
}
