import type { Meet } from '@Analytics/types/analytics'
import { describe, expect, it } from 'vitest'
import { calculateTimelineData } from './timeline'

function makeMeet(overrides: Partial<Meet> = {}): Meet {
    return {
        id: 'test-id',
        meetId: 'abc-defg-hij',
        date: '2024-01-15',
        participants: [],
        ...overrides,
    }
}

describe('calculateTimelineData', () => {
    it('returns empty result when there are no participants and no times', () => {
        const result = calculateTimelineData(makeMeet({ participants: [] }))
        expect(result.participants).toHaveLength(0)
        expect(result.totalDuration).toBe(0)
        expect(result.startTime).toBeNull()
        expect(result.endTime).toBeNull()
    })

    it('derives session bounds from startTime / endTime when available', () => {
        const meet = makeMeet({
            startTime: '2024-01-15 09:00:00',
            endTime: '2024-01-15 10:00:00',
            participants: [{ name: 'Alice', duration: 3000, joinTime: '2024-01-15 09:05:00' }],
        })
        const result = calculateTimelineData(meet)

        expect(result.totalDuration).toBe(3600)
        expect(result.startTime).toEqual(new Date('2024-01-15 09:00:00'))
        expect(result.endTime).toEqual(new Date('2024-01-15 10:00:00'))
    })

    it('estimates session bounds from participant join times when no startTime/endTime', () => {
        const meet = makeMeet({
            participants: [
                { name: 'Alice', duration: 1800, joinTime: '2024-01-15 09:00:00' },
                { name: 'Bob', duration: 900, joinTime: '2024-01-15 09:10:00' },
            ],
        })
        const result = calculateTimelineData(meet)

        // Alice ends at 09:30, Bob ends at 09:25 → latest is Alice at 09:30
        expect(result.totalDuration).toBe(1800)
        expect(result.startTime).toEqual(new Date('2024-01-15 09:00:00'))
    })

    it('calculates correct offsetPercent and durationPercent', () => {
        const meet = makeMeet({
            startTime: '2024-01-15 09:00:00',
            endTime: '2024-01-15 10:00:00', // 3600s session
            participants: [
                // Joins 900s (25%) in, stays 1800s (50% of session)
                { name: 'Alice', duration: 1800, joinTime: '2024-01-15 09:15:00' },
            ],
        })
        const result = calculateTimelineData(meet)
        const alice = result.participants[0]!

        expect(alice.offsetPercent).toBeCloseTo(25)
        expect(alice.durationPercent).toBeCloseTo(50)
        expect(alice.percentage).toBe(50)
    })

    it('clamps offsetPercent to minimum 0', () => {
        // Join time before session start
        const meet = makeMeet({
            startTime: '2024-01-15 09:00:00',
            endTime: '2024-01-15 10:00:00',
            participants: [{ name: 'Early', duration: 1800, joinTime: '2024-01-15 08:50:00' }],
        })
        const result = calculateTimelineData(meet)
        expect(result.participants[0]!.offsetPercent).toBe(0)
    })

    it('returns empty participants when no join times exist for fallback calculation', () => {
        const meet = makeMeet({
            participants: [
                { name: 'NoTime', duration: 600 }, // no joinTime
            ],
        })
        // Without startTime/endTime and without joinTime on participants, joinTimes array is empty
        const result = calculateTimelineData(meet)
        expect(result.participants).toHaveLength(0)
        expect(result.totalDuration).toBe(0)
    })

    it('computes percentage as 100 for a participant present the full session', () => {
        const meet = makeMeet({
            startTime: '2024-01-15 09:00:00',
            endTime: '2024-01-15 10:00:00', // 3600s
            participants: [{ name: 'Full', duration: 3600, joinTime: '2024-01-15 09:00:00' }],
        })
        const result = calculateTimelineData(meet)
        expect(result.participants[0]!.percentage).toBe(100)
    })
})
