import type { Meet } from '@/modules/Analytics/types/analytics'

export function calculateMeetDuration(meet: Meet | undefined): number {
    if (!meet) return 0

    // Try to calculate from start/end time first
    if (meet.startTime && meet.endTime) {
        const start = new Date(meet.startTime).getTime()
        const end = new Date(meet.endTime).getTime()
        if (!isNaN(start) && !isNaN(end) && end > start) {
            return (end - start) / 1000 // Convert ms to seconds
        }
    }

    // Fallback to sum of participant durations
    if (!meet.participants) return 0
    return meet.participants.reduce((acc, p) => acc + p.duration, 0)
}
